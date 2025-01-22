// scheduler.js
const schedule = require('node-schedule');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configure logging
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

function runScraper(scriptName) {
    const logFile = path.join(logDir, `scraper_log_${new Date().toISOString().split('T')[0]}.log`);
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });
    
    console.log(`Starting ${scriptName} at ${new Date().toISOString()}`);
    logStream.write(`\nStarting ${scriptName} at ${new Date().toISOString()}\n`);

    const scraper = spawn('node', [scriptName], {
        cwd: __dirname
    });

    scraper.stdout.pipe(logStream);
    scraper.stderr.pipe(logStream);

    scraper.on('close', (code) => {
        const message = `${scriptName} finished with code ${code} at ${new Date().toISOString()}\n`;
        console.log(message);
        logStream.write(message);
        logStream.write('----------------------------------------\n');
    });
}

function runAllScrapers() {
    const scrapers = [
        'scrapeExperis_xls.js',
        'scrapeForte_xls.js',
        'scrapeWitted_xls.js',
        'scrapeVerama_xls.js',
        'scrapeKons_xls.js',
        'scrapeEmagine_xls.js'
    ];

    for (const scraper of scrapers) {
        runScraper(scraper);
    }

    // Clean up old logs (keep last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    fs.readdir(logDir, (err, files) => {
        if (err) throw err;

        files.forEach(file => {
            const filePath = path.join(logDir, file);
            fs.stat(filePath, (err, stats) => {
                if (err) throw err;

                if (stats.mtime < sevenDaysAgo) {
                    fs.unlink(filePath, err => {
                        if (err) console.error(`Error deleting ${file}:`, err);
                    });
                }
            });
        });
    });
}

// Schedule jobs for 11 AM and 1 PM CEST
schedule.scheduleJob('0 09 * * *', () => {
    console.log('Running 09 AM CEST job');
    runAllScrapers();
});

schedule.scheduleJob('0 13 * * *', () => {
    console.log('Running 1 PM CEST job');
    runAllScrapers();
});

console.log('Scheduler started. Waiting for scheduled times...');