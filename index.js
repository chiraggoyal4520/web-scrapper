#!/usr/bin/env node

const { Command } = require('commander');
const moment = require('moment');
const fs = require('fs-extra');

const Logger = require('./utils/logger');
const Helpers = require('./utils/helpers');
const G2Scraper = require('./scrapers/g2-scraper');
const CapterraScraper = require('./scrapers/capterra-scraper');
const TrustRadiusScraper = require('./scrapers/trustradius-scraper');

class SaaSReviewsScraper {
    constructor() {
        this.logger = new Logger(false);
        this.startTime = moment();
        this.stats = {
            totalReviews: 0,
            sources: [],
            errors: [],
            successRate: 0,
            processingTime: null
        };
    }

    async scrape(options) {
        try {
            this.logger.setVerbose(options.verbose);
            this.logger.info(`Starting scraping for: ${options.company}`);

            // Validate options
            if (!this.validateOptions(options)) {
                return false;
            }

            const scraperOptions = {
                headless: options.headless,
                delay: parseInt(options.delay),
                verbose: options.verbose,
                timeout: parseInt(options.timeout),
                blockResources: options.blockResources,
                proxy: options.proxy || null // <-- pass from CLI to scrapers
            };


            const scrapers = this.createScrapers(options.source, scraperOptions);
            const allReviews = [];

            // Process each scraper
            for (const scraper of scrapers) {
                try {
                    this.logger.info(`Scraping from ${scraper.constructor.name.replace('Scraper', '')}...`);

                    const success = await scraper.initialize();
                    if (!success) {
                        this.logger.error(`Failed to initialize ${scraper.constructor.name}`);
                        continue;
                    }

                    // Search for company product page
                    let productUrl = options.url;
                    if (!productUrl) {
                        productUrl = await scraper.searchForCompany(options.company);
                    }

                    if (!productUrl) {
                        this.logger.warn(`Could not find product page for ${options.company} on ${scraper.constructor.name.replace('Scraper', '')}`);
                        await scraper.cleanup();
                        continue;
                    }

                    // Scrape reviews
                    const reviews = await scraper.scrapeReviews(
                        productUrl,
                        options.startDate,
                        options.endDate,
                        parseInt(options.limit)
                    );

                    if (reviews.length > 0) {
                        allReviews.push(...reviews);
                        this.stats.sources.push(scraper.constructor.name.replace('Scraper', ''));
                        this.logger.info(`Collected ${reviews.length} reviews from ${scraper.constructor.name.replace('Scraper', '')}`);
                    }

                    await scraper.cleanup();

                } catch (error) {
                    this.logger.error(`Error with ${scraper.constructor.name}: ${error.message}`);
                    this.stats.errors.push({
                        scraper: scraper.constructor.name,
                        error: error.message
                    });

                    // Cleanup on error
                    try {
                        await scraper.cleanup();
                    } catch (cleanupError) {
                        this.logger.debug(`Cleanup error: ${cleanupError.message}`);
                    }
                }
            }

            // Process and save results
            if (allReviews.length > 0) {
                await this.processResults(allReviews, options);
                return true;
            } else {
                this.logger.error('No reviews were collected from any source');
                return false;
            }

        } catch (error) {
            this.logger.error(`Scraping failed: ${error.message}`);
            return false;
        }
    }

    validateOptions(options) {
        if (!options.company) {
            this.logger.error('Company name is required');
            return false;
        }

        if (options.startDate && !Helpers.validateDate(options.startDate)) {
            this.logger.error('Invalid start date format. Use YYYY-MM-DD');
            return false;
        }

        if (options.endDate && !Helpers.validateDate(options.endDate)) {
            this.logger.error('Invalid end date format. Use YYYY-MM-DD');
            return false;
        }

        if (options.startDate && options.endDate) {
            const start = moment(options.startDate);
            const end = moment(options.endDate);

            if (start.isAfter(end)) {
                this.logger.error('Start date cannot be after end date');
                return false;
            }
        }

        const validSources = ['g2', 'capterra', 'trustradius', 'all'];
        if (!validSources.includes(options.source.toLowerCase())) {
            this.logger.error(`Invalid source. Valid options: ${validSources.join(', ')}`);
            return false;
        }

        return true;
    }

    createScrapers(source, options) {
        const scrapers = [];

        switch (source.toLowerCase()) {
            case 'g2':
                scrapers.push(new G2Scraper(options));
                break;
            case 'capterra':
                scrapers.push(new CapterraScraper(options));
                break;
            case 'trustradius':
                scrapers.push(new TrustRadiusScraper(options));
                break;
            case 'all':
                scrapers.push(
                    new G2Scraper(options),
                    new CapterraScraper(options),
                    new TrustRadiusScraper(options)
                );
                break;
        }

        return scrapers;
    }

    async processResults(reviews, options) {
        try {
            // Remove duplicates based on content similarity
            const uniqueReviews = this.removeDuplicates(reviews);

            // Sort by date (newest first)
            uniqueReviews.sort((a, b) => {
                const dateA = moment(a.date);
                const dateB = moment(b.date);
                return dateB.isValid() && dateA.isValid() ? dateB.diff(dateA) : 0;
            });

            // Create final dataset
            const finalReviews = uniqueReviews.map(review => Helpers.createReviewObject(review));

            // Generate filename and save
            const filename = Helpers.generateOutputFilename(options.company);
            const filePath = await Helpers.saveToFile(finalReviews, filename);

            // Update stats
            this.stats.totalReviews = finalReviews.length;
            this.stats.processingTime = moment().diff(this.startTime, 'seconds');
            this.stats.successRate = Math.round((this.stats.totalReviews / reviews.length) * 100);
            this.stats.startDate = options.startDate;
            this.stats.endDate = options.endDate;

            // Log results
            this.logger.success(`Results saved to: ${filePath}`);
            Helpers.logScrapingStats(this.stats);

            // Save stats file if verbose
            if (options.verbose) {
                const statsFile = filename.replace('.json', '_stats.json');
                await Helpers.saveToFile(this.stats, statsFile);
            }

        } catch (error) {
            this.logger.error(`Error processing results: ${error.message}`);
            throw error;
        }
    }

    removeDuplicates(reviews) {
        const seen = new Set();
        const uniqueReviews = [];

        for (const review of reviews) {
            // Create a simple hash of the review content
            const hash = this.createReviewHash(review);

            if (!seen.has(hash)) {
                seen.add(hash);
                uniqueReviews.push(review);
            }
        }

        return uniqueReviews;
    }

    createReviewHash(review) {
        const content = (review.content || '').slice(0, 100);
        const author = review.author || '';
        const date = review.date || '';

        return `${content}_${author}_${date}`.toLowerCase().replace(/\s+/g, '');
    }
}

// CLI Setup
const program = new Command();

program
    .name('saas-reviews-scraper')
    .description('A comprehensive Node.js scraper for collecting SaaS product reviews')
    .version('1.0.0');

program
    .requiredOption('-c, --company <name>', 'Company name to search for')
    .option('-s, --source <source>', 'Source to scrape from (g2, capterra, trustradius, all)', 'g2')
    .option('-u, --url <url>', 'Direct URL to scrape (optional)')
    .option('--start-date <date>', 'Start date for reviews (YYYY-MM-DD)')
    .option('--end-date <date>', 'End date for reviews (YYYY-MM-DD)')
    .option('--proxy <proxyUrl>', 'Proxy server URL, e.g. http://user:pass@ip:port')
    .option('-l, --limit <number>', 'Maximum number of reviews to collect', '100')
    .option('-d, --delay <ms>', 'Delay between requests in milliseconds', '2000')
    .option('-t, --timeout <ms>', 'Page load timeout in milliseconds', '30000')
    .option('--headless <boolean>', 'Run browser in headless mode', 'true')
    .option('--verbose', 'Enable verbose logging', false)
    .option('--block-resources', 'Block images and CSS for faster loading', false)
    .action(async (options) => {
        // Convert string boolean to actual boolean
        options.headless = !(String(options.headless).toLowerCase() === 'false');

        const scraper = new SaaSReviewsScraper();
        const success = await scraper.scrape(options);

        process.exit(success ? 0 : 1);
    });

// Examples command
program
    .command('examples')
    .description('Show usage examples')
    .action(() => {
        console.log(`
Examples:

  Basic usage - scrape G2 reviews for Slack:
  $ node index.js -c "Slack" -s "g2" --start-date "2024-01-01" --end-date "2024-12-31"

  Scrape from all sources with limit:
  $ node index.js -c "Microsoft Teams" -s "all" --start-date "2024-01-01" --end-date "2024-12-31" -l 200

  Verbose mode with visible browser:
  $ node index.js -c "Zoom" -s "g2" --start-date "2024-01-01" --end-date "2024-12-31" --verbose --headless false

  Use direct URL:
  $ node index.js -c "Slack" -u "https://www.g2.com/products/slack/reviews" --start-date "2024-01-01" --end-date "2024-12-31"

  Custom delays and timeout:
  $ node index.js -c "Slack" -s "all" --start-date "2024-01-01" --end-date "2024-12-31" -d 5000 -t 60000
`);
    });

if (require.main === module) {
    program.parse();
}

module.exports = SaaSReviewsScraper;
