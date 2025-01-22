const puppeteer = require('puppeteer');
const ExcelJS = require('exceljs');
const fs = require('fs');

const EXCEL_FILE = 'Jobs_kildefil.xlsx';

async function scrapeEmagine(page) {
    console.log('Scraping Emagine...');
    try {
        await page.goto('https://emagine.org/jobs');
        const cookieButton = await page.$('#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll');
        if (cookieButton) {
            console.log('Found cookies button. Clicking...');
            await cookieButton.click();
        }
        await page.waitForSelector('.assignment-list-item', { timeout: 30000 });
        return await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.assignment-list-item')).map(item => ({
                id: item.querySelector('a')?.href.split('=')[1]?.split('&')[0] || 'Unknown ID',
                title: item.querySelector('.title')?.innerText.trim() || 'Unknown Title',
                client: 'Emagine',
                deadline: item.querySelector('.deadline')?.innerText.trim() || 'No deadline',
                url: item.querySelector('a')?.href || 'No URL',
                source: 'Emagine'
            }));
        });
    } catch (error) {
        console.error(`Error scraping Emagine: ${error.message}`);
        return [];
    }
}

async function scrapeExperis(page) {
    console.log('Scraping Experis...');
    try {
        await page.goto('https://experis.no/jobs');
        await page.waitForSelector('.job-listing', { timeout: 30000 });
        return await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.job-listing')).map(item => ({
                id: item.querySelector('a')?.href.split('=')[1]?.split('&')[0] || 'Unknown ID',
                title: item.querySelector('.job-title')?.innerText.trim() || 'Unknown Title',
                client: 'Experis',
                deadline: item.querySelector('.job-deadline')?.innerText.trim() || 'No deadline',
                url: item.querySelector('a')?.href || 'No URL',
                source: 'Experis'
            }));
        });
    } catch (error) {
        console.error(`Error scraping Experis: ${error.message}`);
        return [];
    }
}

async function scrapeForte(page) {
    console.log('Scraping Forte...');
    try {
        await page.goto('https://forte.no/assignments');
        await page.waitForSelector('.job-card', { timeout: 30000 });
        return await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.job-card')).map(item => ({
                id: item.querySelector('a')?.href.split('=')[1]?.split('&')[0] || 'Unknown ID',
                title: item.querySelector('.job-title')?.innerText.trim() || 'Unknown Title',
                client: 'Forte',
                deadline: item.querySelector('.job-deadline')?.innerText.trim() || 'No deadline',
                url: item.querySelector('a')?.href || 'No URL',
                source: 'Forte'
            }));
        });
    } catch (error) {
        console.error(`Error scraping Forte: ${error.message}`);
        return [];
    }
}

async function saveToExcel(jobs) {
    const workbook = new ExcelJS.Workbook();
    let worksheet;

    if (fs.existsSync(EXCEL_FILE)) {
        await workbook.xlsx.readFile(EXCEL_FILE);
        worksheet = workbook.getWorksheet('Jobs') || workbook.addWorksheet('Jobs');
    } else {
        worksheet = workbook.addWorksheet('Jobs');
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 20 },
            { header: 'Title', key: 'title', width: 40 },
            { header: 'Client', key: 'client', width: 30 },
            { header: 'Deadline', key: 'deadline', width: 20 },
            { header: 'URL', key: 'url', width: 50 },
            { header: 'Source', key: 'source', width: 15 },
        ];
    }

    const existingIds = new Set(worksheet.getColumn('id').values);
    const newJobs = jobs.filter(job => !existingIds.has(job.id));

    newJobs.forEach(job => worksheet.addRow(job));
    console.log(`${newJobs.length} new rows added.`);

    await workbook.xlsx.writeFile(EXCEL_FILE);
    console.log(`Data saved to ${EXCEL_FILE}`);
}

(async () => {
    console.log('Starting merged scraping script...');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const allJobs = [];
    allJobs.push(...await scrapeEmagine(page));
    allJobs.push(...await scrapeExperis(page));
    allJobs.push(...await scrapeForte(page));

    if (allJobs.length > 0) {
        await saveToExcel(allJobs);
    } else {
        console.log('No jobs scraped. Skipping Excel save.');
    }

    await browser.close();
    console.log('Merged scraping script completed.');
})();