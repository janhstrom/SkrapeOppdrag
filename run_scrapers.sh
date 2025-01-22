#!/bin/bash

# Set working directory to where your scripts are located
cd /Users/janhstrom/puppeteer-scraper

# Log file for output
LOG_FILE="scraper_log_$(date +%Y%m%d_%H%M%S).log"

# Function to run a scraper and log its output
run_scraper() {
    echo "Starting $1 at $(date)" >> "$LOG_FILE"
    node "$1" >> "$LOG_FILE" 2>&1
    echo "Finished $1 at $(date)" >> "$LOG_FILE"
    echo "----------------------------------------" >> "$LOG_FILE"
}

# Run all scrapers
run_scraper "scrapeExperis_xls.js"
run_scraper "scrapeForte_xls.js"
run_scraper "scrapeWitted_xls.js"
run_scraper "scrapeVerama_xls.js"
run_scraper "scrapeKons_xls.js"
run_scraper "scrapeEmagine_xls.js"

# Archive old logs (keep last 7 days)
find . -name "scraper_log_*.log" -mtime +7 -delete