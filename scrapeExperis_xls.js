// scrapeExperis_xls.js
const puppeteer = require('puppeteer');
const { saveToExcel } = require('./excelUtils');
const path = require('path');

// Configuration
const CONFIG = {
    EXCEL_FILE: path.join(process.env.HOME, 'Library/CloudStorage/OneDrive-EiQAS/Documents - Oppdragsliste/jobs_Experis.xlsx'),
};

(async () => {
    console.log('Starting script...');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto('https://experis.recman.no/', { waitUntil: 'domcontentloaded' });
        console.log('Page loaded.');

        try {
            const cookiePopupSelector = 'a.btn.btn-success';
            if (await page.$(cookiePopupSelector)) {
                await page.click(cookiePopupSelector);
                console.log('Cookie popup closed.');
            }
        } catch (err) {
            console.log('No cookie popup found.');
        }

        const jobOverview = await page.evaluate(() => {
            const jobNodes = document.querySelectorAll('.box[onclick]');
            return Array.from(jobNodes).map(node => {
                const titleElement = node.querySelector('td:nth-child(2) span');
                const idMatch = node.getAttribute('onclick').match(/job_id=(\d+)/);
                const jobId = idMatch ? idMatch[1] : null;

                return titleElement && jobId ? {
                    title: titleElement.innerText.trim(),
                    jobId: jobId,
                    url: `https://experis.recman.no/job.php?job_id=${jobId}`
                } : null;
            }).filter(Boolean);
        });

        console.log(`Found ${jobOverview.length} potential jobs.`);
        const detailedJobs = [];

        for (const job of jobOverview) {
            try {
                console.log(`Navigating to job detail page: ${job.url}`);
                await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await page.waitForSelector('#job_body', { timeout: 30000 });

                const jobDetails = await page.$eval('#job_body', el => el.innerText);

                const extractDetail = (label, fallback = '') => {
                    const regex = new RegExp(`${label}:?\\s*([^\\n<]+)`, 'i');
                    const match = jobDetails.match(regex);
                    return match && match[1] ? match[1].trim() : fallback;
                };

                const jobInfo = {
                    id: job.jobId,
                    title: job.title,
                    client: extractDetail('Kunde|Client'),
                    start: extractDetail('Start|Startdato'),
                    endDate: extractDetail('Sluttdato|End date'),
                    duration: extractDetail('Varighet|Duration'),
                    scope: extractDetail('Omfang|Scope'),
                    location: extractDetail('Lokasjon|Location'),
                    language: extractDetail('Språk|Language'),
                    expertise: extractDetail('Kompetanse|Expertise'),
                    level: extractDetail('Nivå|Level'),
                    category: extractDetail('Kategori|Category'),
                    status: extractDetail('Status'),
                    deadline: extractDetail('Søknadsfrist|Deadline'),
                    url: job.url,
                    source: 'Experis'
                };

                detailedJobs.push(jobInfo);
                console.log(`Fetched details for: ${job.title}`);
            } catch (err) {
                console.log(`Error fetching details for ${job.title}:`, err.message);
                continue;
            }
        }

        console.log(`Total detailed jobs fetched: ${detailedJobs.length}`);

        const newRowCount = await saveToExcel(detailedJobs, CONFIG.EXCEL_FILE);
        console.log(`Excel file saved at: ${CONFIG.EXCEL_FILE}`);
        console.log(`${newRowCount} new jobs added.`);

    } catch (err) {
        console.error('An error occurred:', err.message);
    } finally {
        await browser.close();
        console.log('Script finished.');
    }
})();