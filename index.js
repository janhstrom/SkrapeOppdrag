const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://example.com');

    const title = await page.evaluate(() => {
        return document.querySelector('h1').innerText;
    });

    console.log('Page title:', title);
    await page.screenshot({ path: 'screenshot.png' });
    await browser.close();
})();