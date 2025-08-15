const BaseScraper = require('./base-scraper');
const Helpers = require('../utils/helpers');

class CapterraScraper extends BaseScraper {

    constructor(options = {}) {
        super(options);
        this.baseUrl = 'https://www.capterra.com';
        this.searchUrl = 'https://www.capterra.com/search';
    }

    async searchForCompany(companyName) {
        try {
            this.logger.info(`Searching for ${companyName} on Capterra...`);
            const slug = companyName.toLowerCase().replace(/\s+/g, '-');
            const searchUrl = `${this.searchUrl}?query=${encodeURIComponent(slug)}`;
            const success = await this.navigateToPage(searchUrl);
            if (!success) return null;

            await this.page.waitForSelector('.SearchResultCard, .search-result', { timeout: 10000 })
                .catch(() => this.logger.debug('Search results not found, trying alternative approach'));

            const productLink = await this.page.evaluate((companyName) => {
                const links = Array.from(document.querySelectorAll('a[href*="/p/"]'));
                for (const link of links) {
                    const text = link.textContent.toLowerCase();
                    if (text.includes(companyName.toLowerCase())) {
                        return link.href;
                    }
                }
                return links.length > 0 ? links[0].href : null;
            }, companyName);

            if (productLink) {
                this.logger.info(`Found Capterra product page: ${productLink}`);
                // Ensure no double slashes and add /reviews path
                return productLink.replace(/\/+$/, '') + '/reviews';
            }

            this.logger.warn(`No Capterra product found for ${companyName}`);
            return null;

        } catch (error) {
            this.logger.error(`Error searching for company on Capterra: ${error.message}`);
            return null;
        }
    }

    async scrapeReviews(url, startDate, endDate, limit = 100) {
        try {
            this.logger.info('Starting Capterra review scraping...');
            if (!url) throw new Error('No URL provided for scraping');

            let allReviews = [];
            let currentPage = 1;
            const maxPages = Math.ceil(limit / 20);
            const baseUrl = url.replace(/\/+$/, ''); // remove trailing slashes

            while (allReviews.length < limit && currentPage <= maxPages) {
                const pageUrl = `${baseUrl}?page=${currentPage}`;
                this.logger.debug(`Navigating to page ${currentPage}: ${pageUrl}`);
                const navOk = await this.navigateToPage(pageUrl);
                if (!navOk) break;

                if (await this.checkForBlocking()) {
                    this.logger.error('Blocked by Capterra');
                    break;
                }

                await this.handleCaptcha();
                await this.autoScroll();

                await this.page.waitForSelector('.review-card', { timeout: 30000 })
                    .catch(() => this.logger.debug('No reviews found on this page'));

                const pageReviews = await this.extractCapterraReviews();
                if (!pageReviews.length) break;

                const filtered = this.filterReviewsByDateRange(pageReviews, startDate, endDate);
                const unique = this.removeDuplicateReviews(allReviews, filtered);
                allReviews.push(...unique);

                this.logger.debug(`Collected so far: ${allReviews.length}`);

                if (filtered.length === 0) break; // Stop if date range exhausted
                currentPage++;
                await Helpers.delay(this.options.delay);
            }

            this.reviews = allReviews.slice(0, limit);
            this.logger.success(`Successfully scraped ${this.reviews.length} reviews from Capterra`);
            return this.reviews;

        } catch (error) {
            this.logger.error(`Capterra scraping failed: ${error.message}`);
            return [];
        }
    }

    async extractCapterraReviews() {
        try {
            return await this.page.evaluate(() => {
                const reviewElements = document.querySelectorAll([
                    '.review-card',
                    '[data-container-view="ca-review"]'
                ].join(', '));

                const reviews = [];
                reviewElements.forEach((element, index) => {
                    try {
                        const title = element.querySelector('h3.h5')?.textContent.trim() || null;
                        const ratingText = element.querySelector('.ms-1')?.textContent.trim() || null;
                        const rating = ratingText ? parseFloat(ratingText) : null;
                        const date = element.querySelector('.text-ash span.ms-2')?.textContent.trim() || null;
                        const author = element.querySelector('.h5.fw-bold')?.textContent.trim() || null;

                        let prosText = null, consText = null;
                        element.querySelectorAll('p.fw-bold').forEach(label => {
                            const labelText = label.innerText.trim().toLowerCase();
                            if (labelText.startsWith('pros')) {
                                prosText = label.nextElementSibling?.innerText?.trim() || null;
                            }
                            if (labelText.startsWith('cons')) {
                                consText = label.nextElementSibling?.innerText?.trim() || null;
                            }
                        });

                        // For main content: find first paragraph after title that isn't pros/cons
                        let content = '';
                        const paragraphs = element.querySelectorAll('p');
                        paragraphs.forEach(p => {
                            const txt = p.innerText.trim();
                            if (txt && !/^(pros|cons)\s*:/i.test(txt)) {
                                content += txt + '\n';
                            }
                        });
                        content = content.trim();

                        reviews.push({
                            id: `capterra_${index}_${Date.now()}`,
                            title,
                            rating,
                            author,
                            date,
                            content: content || null,
                            pros: prosText,
                            cons: consText,
                            source: 'Capterra'
                        });
                    } catch (err) {
                        console.warn('Error extracting individual review:', err);
                    }
                });

                return reviews;
            });

        } catch (error) {
            this.logger.error('Error extracting Capterra reviews:', error);
            return [];
        }
    }

    removeDuplicateReviews(existingReviews, newReviews) {
        const existingContents = new Set(existingReviews.map(r => r.content));
        return newReviews.filter(r => !existingContents.has(r.content));
    }
}

module.exports = CapterraScraper;
