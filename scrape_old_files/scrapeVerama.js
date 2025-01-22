const puppeteer = require('puppeteer');
const fs = require('fs');
const { writeToPath } = require('fast-csv'); // Importer fast-csv for CSV-eksport

(async () => {
    console.log('Starter skriptet...');

    // Start nettleseren
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Overvåk API-kall for jobber
    page.on('response', async (response) => {
        try {
            const url = response.url();
            const contentType = response.headers()['content-type'];

            // Fang opp jobblisten
            if (contentType?.includes('application/json') && url.includes('/api/public/job-requests')) {
                const jsonData = await response.json();

                // Filtrer jobber for Norway
                const filteredJobs = jsonData.content.filter(job =>
                    job.locations.some(location => location.country === 'Norway')
                );

                console.log(`Fant ${filteredJobs.length} jobber i Norway.`);

                // **Rydd opp i dataene før lagring**
                const cleanedJobs = filteredJobs.map(job => ({
                    id: job.id,
                    title: job.title,
                    start: job.startDate,
                    endDate: job.endDate,
                    city: job.locations[0]?.city || 'N/A',
                    level: job.level,
                    client: job.legalEntityClient.name || 'Unknown',
                    applicationDeadline: job.lastDayOfApplications,
                    status: job.status,
                    url: `https://app.verama.com/en/job-requests/${job.id}`,
                    source: 'Verama' // Nytt felt "source"
                }));

                // Lagre JSON-fil
                // utelater const jsonFileName = 'jobs_Verama.json';
                // utelater fs.writeFileSync(jsonFileName, JSON.stringify(cleanedJobs, null, 2));
                // utelater console.log(`JSON-fil lagret i: ${jsonFileName}`);

                // **Lagre CSV-fil**
                const csvFileName = '/Users/janhstrom/Library/CloudStorage/OneDrive-EiQAS/Documents - Oppdragsliste/jobs_Verama.csv';
                writeToPath(csvFileName, cleanedJobs, { headers: true })
                    .on('finish', () => {
                        console.log(`CSV-fil lagret i: ${csvFileName}`);
                    })
                    .on('error', (err) => {
                        console.error('Feil ved lagring av CSV:', err.message);
                    });
            }
        } catch (error) {
            console.error('Feil under API-responsbehandling:', error);
        }
    });

    // Gå til nettsiden
    await page.goto('https://app.verama.com/en/job-requests', { waitUntil: 'networkidle2' });
    console.log('Side lastet.');

    // Håndter cookie-popup
    try {
        const cookieButtonSelector = '#cookies-bar > div > button';
        const cookieButton = await page.$(cookieButtonSelector);
        if (cookieButton) {
            await cookieButton.click();
            console.log('Cookie-popup lukket.');
        } else {
            console.log('Ingen cookie-popup funnet.');
        }
    } catch (error) {
        console.log('Feil under håndtering av cookie-popup:', error.message);
    }

    // **Filterprosess for plassering**
    try {
        const filterSelector = '.el-form-select-next__control';
        await page.waitForSelector(filterSelector, { timeout: 10000 });
        await page.click(filterSelector);
        console.log("'Plassering' filter åpnet.");
    
        const inputSelector = '.el-form-select-next__input input';
        await page.waitForSelector(inputSelector, { timeout: 10000 });
        await page.type(inputSelector, 'Norway', { delay: 100 });
        console.log("'Norway' skrevet inn.");
    
        await page.waitForSelector('div[role="option"], div[class*="option"]', { timeout: 10000 });
        const options = await page.$$('div[role="option"], div[class*="option"]');
        if (options.length > 0) {
            await options[0].click();
            console.log('Første alternativ valgt.');
        } else {
            console.error('Ingen alternativer funnet i dropdown.');
        }
    
        const searchButtonSelector = 'button[type="submit"]';
        await page.waitForSelector(searchButtonSelector, { timeout: 10000 });
        await page.click(searchButtonSelector);
        console.log('Søke-knappen klikket.');
    
        await new Promise(resolve => setTimeout(resolve, 7000));
        console.log('Venter på søkeresultater...');
    } catch (error) {
        console.error('Feil under søkefilterprosess:', error);
    }

    // Avslutt nettleseren
    await browser.close();
    console.log('Ferdig!');
})();