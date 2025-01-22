// scrapeEmagine_xls.js
const puppeteer = require('puppeteer');
const { saveToExcel } = require('./excelUtils');
const path = require('path');

const CONFIG = {
    EXCEL_FILE: path.join(process.env.HOME, 'Library/CloudStorage/OneDrive-EiQAS/Documents - Oppdragsliste/jobs_Emagine.xlsx'),
    PAGE_URL: 'https://emagine.no/konsulenter/freelance-jobs/',
    SCROLL_WAIT: 1000,
    SCROLL_TIMES: 5
};

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        // Navigate to main page
        await page.goto(CONFIG.PAGE_URL, { waitUntil: 'networkidle2' });

        // Handle cookie consent
        const cookieButtonSelector = '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll';
        const cookieButton = await page.$(cookieButtonSelector);

        if (cookieButton) {
            console.log('Found cookie button. Clicking...');
            await cookieButton.click();

            console.log('Waiting for spinner to disappear...');
            await page.waitForSelector('.spinner', { hidden: true, timeout: 15000 });
            console.log('Spinner removed. Continuing...');
        } else {
            console.log('No cookie button found.');
        }

        // Scroll to load dynamic content
        console.log('Scrolling through page to load more jobs...');
        for (let i = 0; i < CONFIG.SCROLL_TIMES; i++) {
            await page.evaluate(() => window.scrollBy(0, window.innerHeight));
            await new Promise(resolve => setTimeout(resolve, CONFIG.SCROLL_WAIT));
        }

        // Wait for job listings
        console.log('Waiting for job listings...');
        await page.waitForSelector('article', { timeout: 60000 });

        // Extract job data
        const jobs = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('article')).map(article => {
                const location = article.querySelector('.address-name')?.textContent.trim() || '';
                const title = article.querySelector('.title')?.textContent.trim() || '';
                const category = article.querySelector('.category-tag-list span')?.textContent.trim() || '';
                const id = article.querySelector('.job_id')?.textContent.trim().replace('#', '') || '';
                const start = article.querySelector('.start-date .convertedDate')?.textContent.trim() || '';
                const durationRaw = article.querySelector('.duration')?.textContent || '';
                const duration = durationRaw ? durationRaw.replace(/\s+/g, ' ').trim() : '';
                const url = article.querySelector('.single-job')?.href || '';

                return {
                    id,
                    title,
                    client: '',          // Not available
                    start,
                    endDate: '',         // Not directly available
                    duration,
                    scope: '',           // Not available
                    location,
                    language: '',        // Not available
                    expertise: '',       // Not directly available
                    level: '',           // Not available
                    category,
                    status: '',          // Not available
                    deadline: '',        // Not available
                    url,
                    source: 'Emagine'
                };
            });
        });

        console.log(`Found ${jobs.length} jobs.`);

        const newRowCount = await saveToExcel(jobs, CONFIG.EXCEL_FILE);
        console.log(`Excel file saved at: ${CONFIG.EXCEL_FILE}`);
        console.log(`${newRowCount} new jobs added.`);

    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        await browser.close();
        console.log('Script finished!');
    }
})();