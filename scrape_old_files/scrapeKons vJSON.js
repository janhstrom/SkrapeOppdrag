const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  console.log('Starting scrape...');

  // Launch Puppeteer and open the page
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://kons.no/oppdrag/');

  // Wait for the elements to load
  await page.waitForSelector('.job_single_href');

  // Scrape the job data
  const jobs = await page.evaluate(() => {
    const jobElements = document.querySelectorAll('.job_single_href');
    return Array.from(jobElements).map(job => {
      const title = job.querySelector('.list-item-title')?.innerText || 'Not specified';
      const client = job.querySelector('.list-item-content h5')?.innerText || 'Not specified';
      const deadline = job.querySelector('.list-item-date:last-child')?.innerText || 'Not specified';
      const url = job.querySelector('a')?.href || 'No link';
      const id = url.split('?id=')[1]?.split('&')[0] || 'Unknown'; // Extract ID from URL

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

  // Prepare the JSON with the `items` property
  const jsonData = {
    items: jobs
  };

  // Save JSON file
  const jsonFileName = '/Users/janhstrom/Library/CloudStorage/OneDrive-EiQAS/Documents - Oppdragsliste/jobs_Kons.json';
  fs.writeFileSync(jsonFileName, JSON.stringify(jsonData, null, 2));
  console.log(`JSON file saved to: ${jsonFileName}`);

  // Close the browser
  await browser.close();
  console.log('Scrape complete!');
})();