const BaseScraper = require('./base-scraper');
const Helpers = require('../utils/helpers');

class TrustRadiusScraper extends BaseScraper {
    constructor(options = {}) {
        super(options);
        this.baseUrl = 'https://www.trustradius.com';
        this.searchUrl = 'https://www.trustradius.com/search';
    }

    async searchForCompany(companyName) {
        try {
            this.logger.info(`Searching for ${companyName} on TrustRadius...`);

            const searchUrl = `${this.searchUrl}?query=${encodeURIComponent(companyName)}`;
            const success = await this.navigateToPage(searchUrl);

            if (!success) return null;

            // Wait for search results
            await this.page.waitForSelector([
                '.search-result',
                '.product-card',
                '[data-testid="search-result"]'
            ].join(', '), { timeout: 10000 }).catch(() => {
                this.logger.debug('Search results not found');
            });

            // Find the product link
            const productLink = await this.page.evaluate((companyName) => {
                const links = Array.from(document.querySelectorAll('a[href*="/products/"]'));

                for (const link of links) {
                    const text = link.textContent.toLowerCase();
                    if (text.includes(companyName.toLowerCase())) {
                        return link.href;
                    }
                }

                // Try alternative selectors
                const altLinks = Array.from(document.querySelectorAll('a[href*="/vendor/"]'));
                for (const link of altLinks) {
                    const text = link.textContent.toLowerCase();
                    if (text.includes(companyName.toLowerCase())) {
                        return link.href;
                    }
                }

                // Return first product link if exact match not found
                return links.length > 0 ? links[0].href : null;
            }, companyName);

            if (productLink) {
                // Ensure the URL points to reviews
                const reviewsUrl = productLink.includes('/reviews') ? 
                    productLink : 
                    productLink + '/reviews';

                this.logger.info(`Found TrustRadius product page: ${reviewsUrl}`);
                return reviewsUrl;
            }

            this.logger.warn(`No TrustRadius product found for ${companyName}`);
            return null;

        } catch (error) {
            this.logger.error(`Error searching for company on TrustRadius: ${error.message}`);
            return null;
        }
    }

    async scrapeReviews(url, startDate, endDate, limit = 100) {
        try {
            this.logger.info('Starting TrustRadius review scraping...');

            if (!url) {
                throw new Error('No URL provided for scraping');
            }

            const success = await this.navigateToPage(url);
            if (!success) return [];

            // Check if we're blocked
            if (await this.checkForBlocking()) {
                this.logger.error('Detected blocking on TrustRadius');
                return [];
            }

            // Handle any CAPTCHA
            await this.handleCaptcha();

            let allReviews = [];
            let attempts = 0;
            const maxAttempts = 10;

            // Try to load more reviews
            while (allReviews.length < limit && attempts < maxAttempts) {
                attempts++;

                // Wait for reviews to load
                await this.page.waitForSelector([
                    '.review-card',
                    '.review-item',
                    '[data-testid="review"]',
                    '.tr-review'
                ].join(', '), { timeout: 10000 }).catch(() => {
                    this.logger.debug('Review elements not found');
                });

                // Extract reviews from current page
                const currentReviews = await this.extractTrustRadiusReviews();

                if (currentReviews.length === 0) {
                    this.logger.debug('No new reviews found, stopping');
                    break;
                }

                // Filter by date range and avoid duplicates
                const newReviews = this.filterReviewsByDateRange(currentReviews, startDate, endDate);
                const uniqueReviews = this.removeDuplicateReviews(allReviews, newReviews);

                allReviews.push(...uniqueReviews);

                this.logger.debug(`Total reviews collected: ${allReviews.length}`);

                // Try to load more reviews
                const loadedMore = await this.loadMoreReviews();
                if (!loadedMore) {
                    // Try pagination
                    const nextPage = await this.goToNextPage();
                    if (!nextPage) {
                        break;
                    }
                }

                await Helpers.delay(this.options.delay);
            }

            this.reviews = allReviews.slice(0, limit);
            this.logger.success(`Successfully scraped ${this.reviews.length} reviews from TrustRadius`);

            return this.reviews;

        } catch (error) {
            this.logger.error(`TrustRadius scraping failed: ${error.message}`);
            return [];
        }
    }

    async extractTrustRadiusReviews() {
        try {
            return await this.page.evaluate(() => {
                const reviewElements = document.querySelectorAll([
                    '.review-card',
                    '.tr-review',
                    '[data-testid="review"]',
                    '.review-item',
                    '.review-container'
                ].join(', '));

                const reviews = [];

                reviewElements.forEach((element, index) => {
                    try {
                        // Extract title
                        const titleEl = element.querySelector([
                            '.review-title',
                            'h3',
                            '.title',
                            '[data-testid="review-title"]',
                            '.tr-review-title'
                        ].join(', '));

                        // Extract content/body
                        const contentEl = element.querySelector([
                            '.review-body',
                            '.review-text',
                            '.content',
                            'p',
                            '.tr-review-body'
                        ].join(', '));

                        // Extract rating
                        const ratingEl = element.querySelector([
                            '.rating',
                            '.stars',
                            '[data-testid="rating"]',
                            '.tr-rating',
                            '.score'
                        ].join(', '));

                        // Extract author
                        const authorEl = element.querySelector([
                            '.reviewer-name',
                            '.author',
                            '.reviewer',
                            '.tr-reviewer-name'
                        ].join(', '));

                        // Extract date
                        const dateEl = element.querySelector([
                            '.review-date',
                            '[datetime]',
                            '.date',
                            'time',
                            '.tr-review-date'
                        ].join(', '));

                        // Extract job title and company size
                        const jobTitleEl = element.querySelector([
                            '.job-title',
                            '.reviewer-title',
                            '.tr-job-title'
                        ].join(', '));

                        const companySizeEl = element.querySelector([
                            '.company-size',
                            '.reviewer-company',
                            '.tr-company-size'
                        ].join(', '));

                        const industryEl = element.querySelector([
                            '.industry',
                            '.reviewer-industry',
                            '.tr-industry'
                        ].join(', '));

                        // Extract pros/cons
                        const prosEl = element.querySelector([
                            '.pros',
                            '.review-pros',
                            '[data-testid="pros"]',
                            '.tr-pros'
                        ].join(', '));

                        const consEl = element.querySelector([
                            '.cons',
                            '.review-cons',
                            '[data-testid="cons"]',
                            '.tr-cons'
                        ].join(', '));

                        // Extract helpful votes
                        const helpfulEl = element.querySelector([
                            '.helpful-count',
                            '.vote-count',
                            '.tr-helpful'
                        ].join(', '));

                        // Extract verified status
                        const verifiedEl = element.querySelector([
                            '.verified',
                            '[data-testid="verified"]',
                            '.tr-verified'
                        ].join(', '));

                        const review = {
                            id: `trustradius_${index}_${Date.now()}`,
                            title: titleEl ? titleEl.textContent.trim() : null,
                            content: contentEl ? contentEl.textContent.trim() : null,
                            rating: ratingEl ? this.extractRatingFromElement(ratingEl) : null,
                            author: authorEl ? authorEl.textContent.trim() : null,
                            date: dateEl ? (dateEl.getAttribute('datetime') || dateEl.textContent.trim()) : null,
                            job_title: jobTitleEl ? jobTitleEl.textContent.trim() : null,
                            company_size: companySizeEl ? companySizeEl.textContent.trim() : null,
                            industry: industryEl ? industryEl.textContent.trim() : null,
                            pros: prosEl ? prosEl.textContent.trim() : null,
                            cons: consEl ? consEl.textContent.trim() : null,
                            helpful_count: helpfulEl ? parseInt(helpfulEl.textContent.match(/\d+/)?.[0]) || 0 : 0,
                            verified: verifiedEl !== null,
                            source: 'TrustRadius'
                        };

                        if (review.title || review.content) {
                            reviews.push(review);
                        }

                    } catch (err) {
                        console.warn('Error extracting individual review:', err);
                    }
                });

                return reviews;
            });

        } catch (error) {
            this.logger.error('Error extracting TrustRadius reviews:', error);
            return [];
        }
    }

    async loadMoreReviews() {
        try {
            // Try clicking "Load More" button
            const loadMoreButton = await this.page.$([
                '[data-testid="load-more"]',
                '.load-more',
                '.show-more',
                'button[class*="more"]',
                '.btn-load-more',
                '.tr-load-more'
            ].join(', '));

            if (loadMoreButton) {
                await loadMoreButton.click();
                await Helpers.delay(3000);
                return true;
            }

            // Try scrolling for infinite scroll
            await this.autoScroll();
            await Helpers.delay(2000);

            return false; // Return false for scrolling as it's less reliable

        } catch (error) {
            this.logger.debug('Load more reviews failed');
            return false;
        }
    }

    async goToNextPage() {
        try {
            // Look for next page button
            const nextButton = await this.page.$([
                '[data-testid="pagination-next"]',
                '.pagination-next',
                'a[aria-label="Next"]',
                '.next-page',
                '[rel="next"]'
            ].join(', '));

            if (nextButton) {
                const isDisabled = await this.page.evaluate(el => {
                    return el.disabled || 
                           el.classList.contains('disabled') || 
                           el.getAttribute('aria-disabled') === 'true';
                }, nextButton);

                if (!isDisabled) {
                    await nextButton.click();
                    await this.page.waitForNavigation({ 
                        waitUntil: 'networkidle2',
                        timeout: 10000
                    });
                    await Helpers.delay(2000);
                    return true;
                }
            }

            return false;
        } catch (error) {
            this.logger.debug('Next page navigation failed');
            return false;
        }
    }

    removeDuplicateReviews(existingReviews, newReviews) {
        const existingIds = new Set(existingReviews.map(r => r.id));
        const existingContent = new Set(existingReviews.map(r => r.content));

        return newReviews.filter(review => 
            !existingIds.has(review.id) && 
            !existingContent.has(review.content)
        );
    }

    extractRatingFromElement(element) {
        try {
            // Try to extract from data attributes
            const dataRating = element.getAttribute('data-rating') || 
                              element.getAttribute('data-score') ||
                              element.getAttribute('data-value');
            if (dataRating) return parseFloat(dataRating);

            // Try to extract from star elements
            const stars = element.querySelectorAll('.star, [class*="star"]');
            if (stars.length > 0) {
                let rating = 0;
                stars.forEach(star => {
                    if (star.classList.contains('filled') || 
                        star.classList.contains('active') ||
                        star.classList.contains('full') ||
                        star.style.color === 'gold' ||
                        star.style.color === 'orange' ||
                        star.style.color === '#ffa500') {
                        rating++;
                    } else if (star.classList.contains('half')) {
                        rating += 0.5;
                    }
                });
                return rating;
            }

            // Try to extract from aria-label
            const ariaLabel = element.getAttribute('aria-label') || element.getAttribute('title');
            if (ariaLabel) {
                const match = ariaLabel.match(/(\d+(?:\.\d+)?)/);
                if (match) return parseFloat(match[1]);
            }

            // Try to extract from text content
            const text = element.textContent.trim();
            const match = text.match(/(\d+(?:\.\d+)?)/);
            if (match) return parseFloat(match[1]);

            return null;
        } catch (error) {
            return null;
        }
    }
}

module.exports = TrustRadiusScraper;
