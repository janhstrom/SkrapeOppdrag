const puppeteer = require('puppeteer');
const fs = require('fs');
const { writeToPath } = require('fast-csv'); // Importer fast-csv for CSV-eksport

(async () => {
    console.log('Starter skriptet...');
    const browser = await puppeteer.launch({ headless: true }); // Kjør i headless-modus
    const page = await browser.newPage();

    // Gå til hovedsiden
    await page.goto('https://wittedpartners.com/projects?location=norway', { waitUntil: 'networkidle2' });

    // Hent lenker til alle stillinger
    const jobLinks = await page.evaluate(() => {
        const links = [];
        document.querySelectorAll('ul.wrapper li[data-list-item] a').forEach(link => {
            links.push(link.href);
        });
        return links;
    });

    console.log(`Fant ${jobLinks.length} stillinger.`);

    const jobs = [];

    for (const link of jobLinks) {
        await page.goto(link, { waitUntil: 'networkidle2' });

        const jobDetails = await page.evaluate(() => {
            const cleanText = (text) => text?.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim() || null;

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

            return {
                title: cleanText(document.querySelector('h1')?.innerText || null),
                start: details['oppstart'] || '',
                duration: details['varighet'] || '',
                scope: details['omfang'] || '',
                location: details['lokasjon'] || '',
                language: details['språk'] || '',
                expertise: details['erfaring med'] || '',
                deadline: details['frist'] || ''
            };
        });

        // Fjern tomme felter
        const filteredJobDetails = Object.fromEntries(
            Object.entries(jobDetails).filter(([_, value]) => value && value.trim() !== '')
        );

        // Legg til URL og source
        filteredJobDetails.source = 'Witted'; // Nytt felt "source" 
        filteredJobDetails.id = link.split('/').pop().split('-')[0]; // Hent ID fra URL (før "-")
        filteredJobDetails.url = link; // Nytt felt "url"
        
       

        jobs.push(filteredJobDetails);
    }

    // Lagre i JSON-fil
    // utelater const jsonFileName = 'jobs_Witted.json';
    // utelater fs.writeFileSync(jsonFileName, JSON.stringify(jobs, null, 2));
    // utelater console.log(`JSON-fil lagret i: ${jsonFileName}`);

    // **Eksporter til CSV-fil**
    const csvFileName = '/Users/janhstrom/Library/CloudStorage/OneDrive-EiQAS/Documents - Oppdragsliste/jobs_Witted.csv';
    writeToPath(csvFileName, jobs, { headers: true })
        .on('finish', () => {
            console.log(`CSV-fil lagret i: ${csvFileName}`);
        })
        .on('error', (err) => {
            console.error('Feil ved lagring av CSV:', err.message);
        });

    await browser.close();
    console.log('Ferdig!');
})();