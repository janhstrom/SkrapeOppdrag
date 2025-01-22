const puppeteer = require('puppeteer');
const fs = require('fs');
const { writeToPath } = require('fast-csv');

(async () => {
  console.log('Starting script...');

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://kons.no/oppdrag/');

  await page.waitForSelector('.job_single_href');

  const jobs = await page.evaluate(() => {
    const jobElements = document.querySelectorAll('.job_single_href');

    return Array.from(jobElements).map(job => {
      const title = job.querySelector('.list-item-title')?.innerText.trim() || 'Not provided';
      const client = job.querySelector('.list-item-content h5')?.innerText.trim() || 'Not provided';
      const deadline = job.querySelector('.list-item-date:last-child')?.innerText.trim() || 'Not provided';
      const url = job.querySelector('a')?.href.trim() || 'No link';
      const id = url.split('/').pop()?.split('-')[0] || 'Unknown ID';

      return { 
        id,
        title, 
        client, 
        deadline, 
        url, 
        source: 'Kons'
      };
    });
  });

  console.log(`Found ${jobs.length} jobs.`);

  // Save JSON file
  const jsonFileName = 'jobs_Kons.json';
  fs.writeFileSync(jsonFileName, JSON.stringify(jobs, null, 2), 'utf8');
  console.log(`JSON file saved at: ${jsonFileName}`);

  // Save CSV file
  const csvFileName = '/Users/janhstrom/Library/CloudStorage/OneDrive-EiQAS/Documents - Oppdragsliste/jobs_Kons.csv';
  writeToPath(csvFileName, jobs, { headers: true })
    .on('finish', () => {
      console.log(`CSV file saved at: ${csvFileName}`);
    })
    .on('error', (err) => {
      console.error('Error saving CSV file:', err.message);
    });

  await browser.close();
  console.log('Script finished!');
})();