const puppeteer = require('puppeteer');
const fs = require('fs');
const { writeToPath } = require('fast-csv'); // Importer fast-csv for CSV-eksport

(async () => {
  console.log('Starter skriptet...');

  // Start nettleseren
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Gå til hovedsiden
  await page.goto('https://experis.recman.no/', { waitUntil: 'domcontentloaded' });
  console.log('Side lastet.');

  // Håndter cookie-popup
  try {
    const cookiePopupSelector = 'a.btn.btn-success';
    if (await page.$(cookiePopupSelector)) {
      await page.click(cookiePopupSelector);
      console.log('Cookie-popup lukket.');
    }
  } catch (err) {
    console.log('Ingen cookie-popup funnet.');
  }

  // Hent jobblisten
  const jobOverview = await page.evaluate(() => {
    const jobNodes = document.querySelectorAll('.box[onclick]');
    const jobList = [];
    jobNodes.forEach(node => {
      const titleElement = node.querySelector('td:nth-child(2) span');
      const idMatch = node.getAttribute('onclick').match(/job_id=(\d+)/);
      const jobId = idMatch ? idMatch[1] : null;

      if (titleElement && jobId) {
        jobList.push({
          title: titleElement.innerText.trim(),
          jobId: jobId,
          url: `https://experis.recman.no/job.php?job_id=${jobId}`
        });
      }
    });
    return jobList;
  });

  console.log(`Fant ${jobOverview.length} mulige oppdrag.`);

  // Hent detaljer for hver jobb
  const detailedJobs = [];
  for (const job of jobOverview) {
    try {
      await page.goto(job.url, { waitUntil: 'domcontentloaded' });

      // Vent på #job_body
      await page.waitForSelector('#job_body', { timeout: 10000 })
        .catch(() => { throw new Error('Timeout - klarte ikke å laste detaljsiden'); });

      // Hent hele teksten fra job_body
      const jobDetails = await page.$eval('#job_body', el => el.innerText);

      // Formater detaljfeltet
      const cleanDetails = jobDetails.replace(/\n+/g, ' ').trim();

      // Funksjon for å trekke ut detaljer
      const extractDetail = (label, fallback = '') => {
        const regex = new RegExp(`${label}:?\\s*([^\\n<]+)`, 'i');
        const match = jobDetails.match(regex);
        return match && match[1] ? match[1].trim() : fallback;
      };

      // Ekstraher spesifikke detaljer
      const jobInfo = {
        id: extractDetail('Refnr|Reference number'),
        start: extractDetail('Start|Startdato'),
        duration: extractDetail('Varighet|Duration'),
        scope: extractDetail('Omfang|Scope'),
        location: extractDetail('Lokasjon|Location'),
        deadline: extractDetail('Søknadsfrist|Deadline')
      };

      // Sjekk om noen felt mangler
      const missingFields = Object.entries(jobInfo)
        .filter(([key, value]) => !value)
        .map(([key]) => key);

      if (missingFields.length > 0) {
        console.log(`Advarsel: ${job.title} mangler følgende felt: ${missingFields.join(', ')}`);
      }

      // Legg til jobben i listen
      detailedJobs.push({
        title: job.title,
        url: job.url,
        ...jobInfo,
        details: cleanDetails,
        source: 'Experis' // Nytt felt "source"
      });

      console.log(`Hentet data for: ${job.title}`);
    } catch (err) {
      console.log(`Feil ved henting av detaljer for ${job.title}:`, err.message);
      continue;
    }
  }

  // Lagre detaljene i JSON-fil
   // utelater const jsonFileName = 'jobs_Experis.json';
   // utelater fs.writeFileSync(jsonFileName, JSON.stringify(detailedJobs, null, 2));
   // utelater console.log(`Detaljert jobbfil lagret i: ${jsonFileName}`);

  // *** CSV-EKSPORT STARTER HER ***
  const csvFileName = '/Users/janhstrom/Library/CloudStorage/OneDrive-EiQAS/Documents - Oppdragsliste/jobs_Experis.csv';
  writeToPath(csvFileName, detailedJobs, { headers: true })
    .on('finish', () => {
      console.log(`CSV-fil lagret i: ${csvFileName}`);
    })
    .on('error', (err) => {
      console.error('Feil ved lagring av CSV:', err.message);
    });
  // *** SLUTT PÅ CSV-EKSPORT ***

  // Avslutt nettleseren
  await browser.close();
  console.log('Ferdig!');
})();