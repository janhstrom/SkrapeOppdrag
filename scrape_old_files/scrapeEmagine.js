const puppeteer = require('puppeteer');
const fs = require('fs');
const { writeToPath } = require('fast-csv'); // Importer fast-csv for CSV-eksport

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Gå til hovedsiden
    await page.goto('https://emagine.no/konsulenter/freelance-jobs/', { waitUntil: 'networkidle2' });

    // Aksepter cookies hvis knappen finnes
    const cookieButtonSelector = '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll';
    const cookieButton = await page.$(cookieButtonSelector);

    if (cookieButton) {
      console.log('Fant cookies-knappen. Klikker på den...');
      await cookieButton.click();

      // Vent på at spinneren forsvinner
      console.log('Venter på at spinner forsvinner...');
      await page.waitForSelector('.spinner', { hidden: true, timeout: 15000 });
      console.log('Spinner fjernet. Fortsetter...');
    } else {
      console.log('Cookies-knappen ble ikke funnet.');
    }

    // Scrolling for å laste dynamisk innhold
    console.log('Scroller gjennom siden for å laste inn flere jobber...');
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await new Promise(resolve => setTimeout(resolve, 1000)); // Vent 1 sekund mellom scrolling
    }

    // Vent på jobblistene
    console.log('Venter på jobblistene...');
    await page.waitForSelector('article', { timeout: 60000 });

    // Hent data fra jobblisten
    const jobs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('article')).map(article => {
        const location = article.querySelector('.address-name')?.textContent.trim() || null;
        const title = article.querySelector('.title')?.textContent.trim() || null;
        const category = article.querySelector('.category-tag-list span')?.textContent.trim() || null;
        const id = article.querySelector('.job_id')?.textContent.trim() || null; // Endret fra jobId til id
        const start = article.querySelector('.start-date .convertedDate')?.textContent.trim() || null; // Endret fra startDate til start
        const durationRaw = article.querySelector('.duration')?.textContent || null;
        const duration = durationRaw ? durationRaw.replace(/\s+/g, ' ').trim() : null; // Fjern linjeskift og trim
        const url = article.querySelector('.single-job')?.href || null; // Endret fra jobLink til url

        // Nytt felt "source"
        return { location, title, category, id, start, duration, url, source: 'Emagine' };
      });
    });

    console.log(`Fant ${jobs.length} oppdrag.`);

    // Lagre jobblisten i en JSON-fil
    // utelater fs.writeFileSync('jobs_Emagine.json', JSON.stringify(jobs, null, 2));
    // utelaterconsole.log('Oppdrag lagret i jobs_Emagine.json.');

    // *** CSV-EKSPORT LEGGES TIL HER ***
    const csvFilePath = '/Users/janhstrom/Library/CloudStorage/OneDrive-EiQAS/Documents - Oppdragsliste/jobs_Emagine.csv' ;
    writeToPath(csvFilePath, jobs, { headers: true })
      .on('finish', () => {
        console.log(`CSV-fil lagret i: ${csvFilePath}`);
      })
      .on('error', (err) => {
        console.error('Feil ved lagring av CSV:', err.message);
      });
    // *** SLUTT PÅ CSV-EKSPORT ***

  } catch (error) {
    console.error('En feil oppstod:', error);
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();