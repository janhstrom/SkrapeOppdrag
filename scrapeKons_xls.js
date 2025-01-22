// scrapeKons_xls.js
const puppeteer = require('puppeteer');
const { saveToExcel } = require('./excelUtils');
const path = require('path');

const CONFIG = {
    EXCEL_FILE: path.join(process.env.HOME, 'Library/CloudStorage/OneDrive-EiQAS/Documents - Oppdragsliste/jobs_Kons.xlsx'),
    PAGE_URL: 'https://kons.no/oppdrag/',
    WAIT_TIMEOUT: 15000
};

(async () => {
    console.log('Starting script...');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto(CONFIG.PAGE_URL, { waitUntil: 'networkidle2' });

        console.log('Waiting for job elements...');
        await page.waitForSelector('.job_single_href');

        const jobs = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.job_single_href')).map(job => {
                const url = job.querySelector('a')?.href.trim() || '';
                const id = url.split('id=')[1]?.split('&title')[0] || '';
                const title = job.querySelector('.list-item-title')?.innerText.trim() || '';
                const client = job.querySelector('.list-item-content h5')?.innerText.trim() || '';
                const deadline = job.querySelector('.list-item-date:last-child')?.innerText.trim() || '';

                return {
                    id,
                    title,
                    client,
                    start: '',           // Not available
                    endDate: '',         // Not available
                    duration: '',        // Not available
                    scope: '',           // Not available
                    location: '',        // Not consistently available
                    language: '',        // Not available
                    expertise: '',       // Not available
                    level: '',           // Not available
                    category: '',        // Not available
                    status: '',          // Not available
                    deadline,
                    url,
                    source: 'Kons'
                };
            });
        });

        console.log(`Found ${jobs.length} jobs.`);

        const newRowCount = await saveToExcel(jobs, CONFIG.EXCEL_FILE);
        console.log(`Excel file saved at: ${CONFIG.EXCEL_FILE}`);
        console.log(`${newRowCount} new jobs added.`);

    } catch (error) {
        console.error('An error occurred:', error.message);
    } finally {
        await browser.close();
        console.log('Script finished!');
    }
})();