// scrapeWitted_xls.js
const puppeteer = require('puppeteer');
const { saveToExcel } = require('./excelUtils');
const path = require('path');

const CONFIG = {
    EXCEL_FILE: path.join(process.env.HOME, 'Library/CloudStorage/OneDrive-EiQAS/Documents - Oppdragsliste/jobs_Witted.xlsx'),
    PAGE_URL: 'https://wittedpartners.com/projects?location=norway'
};

(async () => {
    console.log('Starting script...');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto(CONFIG.PAGE_URL, { waitUntil: 'networkidle2' });

        const jobLinks = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('ul.wrapper li[data-list-item] a'))
                .map(link => link.href);
        });

        console.log(`Found ${jobLinks.length} jobs.`);
        const jobs = [];

        for (const link of jobLinks) {
            await page.goto(link, { waitUntil: 'networkidle2' });

            const jobDetails = await page.evaluate(() => {
                const cleanText = (text) => text?.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim() || '';

                const parseDetails = (text) => {
                    const details = {};
                    const fields = ['Oppstart', 'Varighet', 'Omfang', 'Lokasjon', 'Språk', 'Erfaring med', 'Frist'];
                    fields.forEach((field) => {
                        const regex = new RegExp(`${field}:\\s*(.*?)(?=\\s*[A-ZÆØÅ][a-zæøå]|$)`);
                        const match = text.match(regex);
                        if (match) details[field.toLowerCase()] = match[1].trim();
                    });
                    return details;
                };

                const descriptionText = cleanText(document.body.innerText);
                const details = parseDetails(descriptionText);
                const title = cleanText(document.querySelector('h1')?.innerText);

                return {
                    title,
                    start: details['oppstart'] || '',
                    duration: details['varighet'] || '',
                    scope: details['omfang'] || '',
                    location: details['lokasjon'] || '',
                    language: details['språk'] || '',
                    expertise: details['erfaring med'] || '',
                    deadline: details['frist'] || ''
                };
            });

            const id = link.split('/').pop().split('-')[0];
            jobs.push({
                ...jobDetails,
                id,
                url: link,
                source: 'Witted',
                client: '',
                endDate: '',
                level: '',
                category: '',
                status: ''
            });
        }

        console.log(`Processed ${jobs.length} jobs.`);

        const newRowCount = await saveToExcel(jobs, CONFIG.EXCEL_FILE);
        console.log(`Excel file saved at: ${CONFIG.EXCEL_FILE}`);
        console.log(`${newRowCount} new jobs added.`);

    } catch (error) {
        console.error('An error occurred:', error.message);
    } finally {
        await browser.close();
        console.log('Script finished.');
    }
})();