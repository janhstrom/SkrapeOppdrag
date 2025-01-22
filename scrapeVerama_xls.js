// scrapeVerama_xls.js
const puppeteer = require('puppeteer');
const { saveToExcel } = require('./excelUtils');
const path = require('path');

const CONFIG = {
    EXCEL_FILE: path.join(process.env.HOME, 'Library/CloudStorage/OneDrive-EiQAS/Documents - Oppdragsliste/jobs_Verama.xlsx'),
    PAGE_URL: 'https://app.verama.com/en/job-requests',
    WAIT_TIMEOUT: 15000,
    RESULTS_WAIT: 10000
};

const waitAndLog = async (ms, message) => {
    console.log(`Waiting ${ms}ms: ${message}`);
    await new Promise(resolve => setTimeout(resolve, ms));
};

async function handleCookiePopup(page) {
    try {
        const cookieButtonSelector = '#cookies-bar > div > button';
        await page.waitForSelector(cookieButtonSelector, { timeout: 5000 });
        await page.click(cookieButtonSelector);
        console.log('Cookie popup closed.');
    } catch (error) {
        console.log('No cookie popup found or timeout - continuing...');
    }
}

async function setLocationFilter(page) {
    try {
        const filterSelector = '.el-form-select-next__control';
        await page.waitForSelector(filterSelector);
        await page.click(filterSelector);
        console.log("Location filter opened.");

        const inputSelector = '.el-form-select-next__input input';
        await page.waitForSelector(inputSelector);
        await page.type(inputSelector, 'Norway', { delay: 100 });
        console.log("'Norway' entered.");

        await page.waitForSelector('div[role="option"], div[class*="option"]');
        const options = await page.$$('div[role="option"], div[class*="option"]');
        
        if (options.length === 0) {
            throw new Error('No options found in dropdown');
        }
        
        await options[0].click();
        console.log('First option selected.');

        const searchButtonSelector = 'button[type="submit"]';
        await page.waitForSelector(searchButtonSelector);
        await page.click(searchButtonSelector);
        console.log('Search button clicked.');

        await waitAndLog(CONFIG.RESULTS_WAIT, 'Waiting for search results...');
    } catch (error) {
        console.error('Error during search filter process:', error);
        throw error;
    }
}

async function processApiResponses(page) {
    return new Promise((resolve) => {
        let allJobs = [];
        let responseCount = 0;
        
        const responseHandler = async (response) => {
            try {
                const url = response.url();
                const contentType = response.headers()['content-type'];

                if (contentType?.includes('application/json') && url.includes('/api/public/job-requests')) {
                    const jsonData = await response.json();
                    responseCount++;

                    const filteredJobs = jsonData.content.filter(job =>
                        job.locations.some(location => location.country === 'Norway')
                    );

                    console.log(`Found ${filteredJobs.length} jobs in Norway from API call #${responseCount}`);

                    const cleanedJobs = filteredJobs.map(job => ({
                        id: job.id,
                        title: job.title,
                        client: job.legalEntityClient?.name || '',
                        start: job.startDate || '',
                        endDate: job.endDate || '',
                        duration: '',  // Calculated from start/end if needed
                        scope: '',     // Not available in API
                        location: job.locations[0]?.city || '',
                        language: '',  // Not available in API
                        expertise: '', // Not available in API
                        level: job.level || '',
                        category: '',  // Not available in API
                        status: job.status || '',
                        deadline: job.lastDayOfApplications || '',
                        url: `https://app.verama.com/en/job-requests/${job.id}`,
                        source: 'Verama'
                    }));

                    allJobs = allJobs.concat(cleanedJobs);
                }
            } catch (error) {
                console.error('Error processing API response:', error);
            }
        };

        const listener = page.on('response', responseHandler);

        setTimeout(() => {
            page.off('response', responseHandler);
            resolve(allJobs);
        }, CONFIG.RESULTS_WAIT);
    });
}

async function main() {
    let browser;
    try {
        console.log('Starting script...');
        
        browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        await page.setDefaultNavigationTimeout(CONFIG.WAIT_TIMEOUT);
        await page.setDefaultTimeout(CONFIG.WAIT_TIMEOUT);

        await page.goto(CONFIG.PAGE_URL, { waitUntil: 'networkidle2' });
        console.log('Page loaded.');

        await handleCookiePopup(page);
        
        const jobsPromise = processApiResponses(page);
        await setLocationFilter(page);
        
        const allJobs = await jobsPromise;
        console.log(`Total ${allJobs.length} jobs collected after API calls.`);

        const newRowCount = await saveToExcel(allJobs, CONFIG.EXCEL_FILE);
        console.log(`Excel file saved at: ${CONFIG.EXCEL_FILE}`);
        console.log(`${newRowCount} new jobs added.`);
        
    } catch (error) {
        console.error('A critical error occurred:', error);
    } finally {
        if (browser) {
            await browser.close();
            console.log('Browser closed.');
        }
    }
}

// Run the script
main().catch(console.error);