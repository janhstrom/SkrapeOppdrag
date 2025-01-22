const puppeteer = require('puppeteer');
const fs = require('fs');
const { writeToPath } = require('fast-csv'); // Importer fast-csv for CSV-eksport

(async () => {
    console.log("Starter skriptet...");
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto('https://platform.fortehub.no/no', { waitUntil: 'domcontentloaded' });
        console.log("Ingen cookies å klikke.");

        // Scroll til bunnen av siden og stopp ved første inaktive oppdrag
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
            console.log("Scroll ferdig.");
        };
        await scrollToBottom();

        // Finn alle aktive oppdrag
        const jobs = await page.evaluate(() => {
            const jobElements = Array.from(document.querySelectorAll('.MuiListItemText-root.css-1tsvksn'));
            return jobElements
                .filter(job => !job.querySelector('.css-1cit1gh .css-48mw7c[aria-label*="arkivert"]') && 
                               !job.textContent.includes("Couldn't find a perfect fit?"))
                .map(job => {
                    const title = job.querySelector('.MuiTypography-subtitle1.css-wktq0a')?.textContent.trim() || 'Ikke tilgjengelig';
                    const location = job.querySelector('.MuiChip-label.css-cxrmjv')?.textContent.trim() || 'Ikke tilgjengelig';
                    const url = job.querySelector('a')?.href || 'Ikke tilgjengelig'; // Felt "url"
                    const client = job.querySelector('.MuiTypography-subtitle1.css-1cs2cth')?.textContent.trim() || 'Ikke tilgjengelig'; // Felt "client"
                    const deadline = job.querySelector('.MuiTypography-root.css-1cs2cth')?.textContent.includes('Tilbudsfrist') 
                        ? job.querySelector('.MuiTypography-root.css-1cs2cth').textContent.replace('Tilbudsfrist:', '').trim() 
                        : 'Ikke tilgjengelig'; 
                    const id = url.split('/').pop(); // Hent ID fra URL (siste del etter "/")
                    
                    // Nytt felt "source"
                    return { 
                        id,
                        title, 
                        location, 
                        url, 
                        client, 
                        deadline,
                        source: 'Forte' // Nytt felt "source"
                    };
                });
        });

        console.log(`Fant ${jobs.length} aktive oppdrag.`);
    
        // **JSON-LAGRING**
       // utelater  const jsonFileName = 'jobs_Forte.json';
       // utelater  fs.writeFileSync(jsonFileName, JSON.stringify(jobs, null, 2));
       // utelater  console.log(`Oppdrag lagret i: ${jsonFileName}`);

        // **CSV-EKSPORT STARTER HER**
        const csvFileName = '/Users/janhstrom/Library/CloudStorage/OneDrive-EiQAS/Documents - Oppdragsliste/jobs_Forte.csv';
        writeToPath(csvFileName, jobs, { headers: true })
            .on('finish', () => {
                console.log(`CSV-fil lagret i: ${csvFileName}`);
            })
            .on('error', (err) => {
                console.error('Feil ved lagring av CSV:', err.message);
            });
        // **SLUTT PÅ CSV-EKSPORT**

    } catch (error) {
        console.error("En feil oppstod:", error.message);
    } finally {
        await browser.close();
    }
})();