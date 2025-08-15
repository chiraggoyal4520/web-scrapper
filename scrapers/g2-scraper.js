const BaseScraper = require('./base-scraper');
const Helpers = require('../utils/helpers');

class G2Scraper extends BaseScraper {
    constructor(options = {}) {
        super(options);
        this.baseUrl = 'https://www.g2.com';
        this.searchUrl = 'https://www.g2.com/search';
    }

    async searchForCompany(companyName) {
        try {
            this.logger.info(`Opening direct G2 reviews page for ${companyName}...`);
            const slug = companyName.toLowerCase().replace(/\s+/g, '-');
            const directUrl = `${this.baseUrl}/products/${slug}/reviews`;
            await this.navigateToPage(directUrl);
            this.logger.info(`Using direct URL: ${directUrl}`);
            return directUrl;
        } catch (err) {
            this.logger.error(`Error opening direct product page: ${err.message}`);
            return null;
        }
    }

    async scrapeReviews(url, startDate, endDate, limit = 100) {
        try {
            this.logger.info('Starting G2 review scraping...');
            if (!url) throw new Error('No URL provided for scraping');

            // First page load
            const success = await this.navigateToPage(url);
            if (!success) return [];

            // Check for blocking before starting
            if (await this.checkForBlocking()) {
                this.logger.error('Detected blocking on G2');
                return [];
            }

            // Handle CAPTCHA if present
            await this.handleCaptcha();

            let allReviews = [];
            let currentPage = 1;
            const maxPages = Math.ceil(limit / 10); // G2 usually shows ~10 reviews per page

            // We'll build direct page URLs instead of clicking "Next"
            const baseUrl = url.split('?')[0]; // strip query params

            while (allReviews.length < limit && currentPage <= maxPages) {
                const pageUrl =
                    currentPage === 1
                        ? baseUrl
                        : `${baseUrl}?page=${currentPage}#reviews`;

                this.logger.debug(`Navigating to page ${currentPage}: ${pageUrl}`);

                const navOk = await this.navigateToPage(pageUrl);
                if (!navOk) break;

                if (await this.checkForBlocking()) {
                    this.logger.error('Blocked while navigating pagination.');
                    break;
                }

                await this.handleCaptcha();

                // Wait for reviews to load
                await this.page
                    .waitForSelector('article [itemprop="reviewRating"]', { timeout: 20000 })
                    .catch(() =>
                        this.logger.debug(
                            `Review elements not found on page ${currentPage}, possibly slow load or block`
                        )
                    );

                // Scroll to load lazy content
                await this.autoScroll();

                // Extract reviews from DOM
                const pageReviews = await this.extractG2Reviews();
                this.logger.debug(`Page ${currentPage} raw reviews: ${pageReviews.length}`);

                if (!pageReviews.length) {
                    this.logger.debug('No reviews found, stopping pagination.');
                    break;
                }

                // Filter by date range if provided
                const filteredReviews = this.filterReviewsByDateRange(
                    pageReviews,
                    startDate,
                    endDate
                );
                this.logger.debug(
                    `Page ${currentPage} after date filter: ${filteredReviews.length}`
                );
                allReviews.push(...filteredReviews);

                // Stop if no new reviews added
                if (filteredReviews.length === 0) break;

                currentPage++;
                await Helpers.delay(this.options.delay);
            }

            // Cut to limit
            this.reviews = allReviews.slice(0, limit);
            this.logger.success(
                `Successfully scraped ${this.reviews.length} reviews from G2`
            );
            return this.reviews;
        } catch (error) {
            this.logger.error(`G2 scraping failed: ${error.message}`);
            return [];
        }
    }


    async extractG2Reviews() {
        try {
            return await this.page.evaluate(() => {
                const reviews = [];
                document.querySelectorAll('article').forEach((el, idx) => {
                    if (!el.querySelector('[itemprop="reviewRating"]')) return;

                    const rating = el.querySelector('[itemprop="reviewRating"] meta[itemprop="ratingValue"]')?.content;
                    const author = el.querySelector('[itemprop="author"] meta[itemprop="name"]')?.content;
                    const date = el.querySelector('meta[itemprop="datePublished"]')?.content;
                    const titleEl = el.querySelector('[itemprop="name"] .elv-font-bold');
                    const title = titleEl?.textContent?.trim() || el.querySelector('[itemprop="name"]')?.textContent?.trim() || null;

                    const content = el.querySelector('[itemprop="reviewBody"]')?.innerText?.trim() || null;

                    let pros = null, cons = null;
                    el.querySelectorAll('section').forEach(sec => {
                        const heading = sec.querySelector('div')?.innerText?.toLowerCase() || '';
                        const para = sec.querySelector('p')?.innerText?.trim() || '';
                        if (heading.includes('like best')) pros = para;
                        if (heading.includes('dislike') || heading.includes('could be better')) cons = para;
                    });

                    reviews.push({
                        id: `g2_${idx}_${Date.now()}`,
                        title,
                        rating: rating ? parseFloat(rating) : null,
                        author,
                        date,
                        content,
                        pros,
                        cons,
                        source: 'G2'
                    });
                });
                return reviews;
            });
        } catch (err) {
            console.error('Error extracting G2 reviews:', err);
            return [];
        }
    }

    async goToNextPage() {
        try {
            const nextButton = await this.page.$([
                '[data-testid="pagination-next"]',
                '.pagination-next',
                'a[aria-label="Next page"]',
                '.pagination a:last-child',
                '[rel="next"]'
            ].join(', '));

            if (nextButton) {
                const isDisabled = await this.page.evaluate(el =>
                    el.disabled || el.classList.contains('disabled') ||
                    el.getAttribute('aria-disabled') === 'true',
                    nextButton
                );
                if (!isDisabled) {
                    await nextButton.click();
                    await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
                    await Helpers.delay(2000);
                    return true;
                }
            }
            return false;
        } catch {
            this.logger.debug('Next page navigation failed');
            return false;
        }
    }
}

module.exports = G2Scraper;