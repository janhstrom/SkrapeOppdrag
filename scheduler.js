const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Konfigurer logging
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

async function runScraper(scriptName) {
    return new Promise((resolve, reject) => {
        console.log(`Starting ${scriptName} at ${new Date().toISOString()}`);
        
        const scraper = spawn('node', [scriptName], {
            cwd: __dirname
        });

        scraper.stdout.on('data', (data) => {
            console.log(`${scriptName}: ${data}`);
        });

        scraper.stderr.on('data', (data) => {
            console.error(`${scriptName} error: ${data}`);
        });

        scraper.on('close', (code) => {
            console.log(`${scriptName} finished with code ${code}`);
            resolve(code);
        });

        // Timeout etter 5 minutter
        setTimeout(() => {
            scraper.kill();
            reject(new Error(`${scriptName} timed out after 5 minutes`));
        }, 300000);
    });
}

async function runAllScrapers() {
    const scrapers = [
        'scrapeExperis_xls.js',
        'scrapeForte_xls.js',
        'scrapeWitted_xls.js',
        'scrapeVerama_xls.js',
        'scrapeKons_xls.js',
        'scrapeEmagine_xls.js'
    ];

    console.log('Starting all scrapers...');
    
    for (const scraper of scrapers) {
        try {
            await runScraper(scraper);
        } catch (error) {
            console.error(`Error running ${scraper}:`, error);
        }
    }

    console.log('All scrapers finished');
    process.exit(0);  // Avslutt prosessen eksplisitt
}

// Kjør scrapers umiddelbart
runAllScrapers().catch(error => {
    console.error('Error in main process:', error);
    process.exit(1);
});