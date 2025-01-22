// scrapeForte_xls.js
const puppeteer = require('puppeteer');
const { saveToExcel } = require('./excelUtils');
const path = require('path');

const CONFIG = {
    EXCEL_FILE: path.join(process.env.HOME, 'Library/CloudStorage/OneDrive-EiQAS/Documents - Oppdragsliste/jobs_Forte.xlsx'),
};

(async () => {
    console.log("Starting script...");
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto('https://platform.fortehub.no/no', { waitUntil: 'domcontentloaded' });
        console.log("No cookies to click.");

        const scrollToBottom = async () => {
            let previousHeight;
            while (true) {
                previousHeight = await page.evaluate('document.body.scrollHeight');
                await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
                await new Promise(resolve => setTimeout(resolve, 1000));
                const currentHeight = await page.evaluate('document.body.scrollHeight');
                const hasInactive = await page.evaluate(() => {
                    return !!document.querySelector('.css-1cit1gh .css-48mw7c[aria-label*="arkivert"]');
                });
                if (currentHeight === previousHeight || hasInactive) break;
            }
            console.log("Scroll finished.");
        };
        await scrollToBottom();

        const jobs = await page.evaluate(() => {
            const jobElements = Array.from(document.querySelectorAll('.MuiListItemText-root.css-1tsvksn'));
            return jobElements
                .filter(job => !job.querySelector('.css-1cit1gh .css-48mw7c[aria-label*="arkivert"]') && 
                               !job.textContent.includes("Couldn't find a perfect fit?"))
                .map(job => {
                    const title = job.querySelector('.MuiTypography-subtitle1.css-wktq0a')?.textContent.trim() || '';
                    const location = job.querySelector('.MuiChip-label.css-cxrmjv')?.textContent.trim() || '';
                    const url = job.querySelector('a')?.href || '';
                    const client = job.querySelector('.MuiTypography-subtitle1.css-1cs2cth')?.textContent.trim() || '';
                    const deadline = job.querySelector('.MuiTypography-root.css-1cs2cth')?.textContent.includes('Tilbudsfrist') 
                        ? job.querySelector('.MuiTypography-root.css-1cs2cth').textContent.replace('Tilbudsfrist:', '').trim() 
                        : '';
                    const id = url.split('/').pop();
                    
                    return { 
                        id,
                        title,
                        client,
                        start: '',
                        endDate: '',
                        duration: '',
                        scope: '',
                        location,
                        language: '',
                        expertise: '',
                        level: '',
                        category: '',
                        status: '',
                        deadline,
                        url,
                        source: 'Forte'
                    };
                });
        });

        console.log(`Found ${jobs.length} active jobs.`);

        const newRowCount = await saveToExcel(jobs, CONFIG.EXCEL_FILE);
        console.log(`Excel file saved at: ${CONFIG.EXCEL_FILE}`);
        console.log(`${newRowCount} new jobs added.`);

    } catch (error) {
        console.error("An error occurred:", error.message);
    } finally {
        await browser.close();
        console.log('Finished!');
    }
})();