const Logger = require('../utils/logger');
const Helpers = require('../utils/helpers');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const userAgents = require('../utils/userAgents.json');

puppeteer.use(StealthPlugin());

class BaseScraper {
  constructor(options = {}) {
    this.options = {
      headless: !(String(options.headless).toLowerCase() === 'false'),
      delay: options.delay || 2000,
      timeout: options.timeout || 30000,
      userAgent: options.userAgent || Helpers.getUserAgent(),
      viewport: options.viewport || { width: 1366, height: 768 },
      proxy: options.proxy || null,
      blockResources: options.blockResources || false,
      ...options
    };

    this.logger = new Logger(options.verbose || false);
    this.browser = null;
    this.page = null;
    this.reviews = [];
  }

  async initialize() {
    try {
      this.logger.debug('Initializing browser...');

      const launchArgs = ['--no-sandbox', '--disable-setuid-sandbox'];
      if (this.options.proxy) {
        launchArgs.push(`--proxy-server=${this.options.proxy}`);
      }

      this.browser = await puppeteer.launch({
        headless: this.options.headless,
        args: launchArgs,
        defaultViewport: null,
        ignoreHTTPSErrors: true,
        dumpio: !!this.options.verbose,
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      });

      this.page = await this.browser.newPage();

      const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
      await this.page.setUserAgent(randomUA);

      await this.page.setViewport({
        width: 1366 + Math.floor(Math.random() * 100),
        height: 768 + Math.floor(Math.random() * 100),
        deviceScaleFactor: 1
      });

      if (this.options.blockResources) {
        await this.page.setRequestInterception(true);
        this.page.on('request', req => {
          const type = req.resourceType();
          if (['stylesheet', 'image', 'font'].includes(type)) {
            req.abort();
          } else {
            req.continue();
          }
        });
      }

      this.logger.debug(`Browser initialized successfully with UA: ${randomUA}`);
      return true;

    } catch (error) {
      this.logger.error('Failed to initialize browser', error);
      return false;
    }
  }

  async humanizePage() {
    await this.page.evaluate(() => {
      window.scrollBy(0, Math.floor(Math.random() * 200) + 100);
    });
    await Helpers.delay(1000 + Math.random() * 2000);
  }

  async navigateToPage(url, waitForSelector = null) {
    try {
      this.logger.debug(`Navigating to: ${url}`);
      await this.page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: this.options.timeout
      });
      await this.humanizePage();

      if (waitForSelector) {
        await this.page.waitForSelector(waitForSelector, {
          timeout: this.options.timeout
        });
      }

      await Helpers.delay(Helpers.getRandomDelay(1000, 3000));
      return true;
    } catch (error) {
      this.logger.error(`Failed to navigate to ${url}`, error);
      return false;
    }
  }

  filterReviewsByDateRange(reviews, startDate, endDate) {
    if (!startDate || !endDate) return reviews;
    return reviews.filter(review => {
      if (!review.date) return false;
      return Helpers.isDateInRange(review.date, startDate, endDate);
    });
  }

  async autoScroll() {
    try {
      await this.page.evaluate(async () => {
        await new Promise(resolve => {
          let totalHeight = 0;
          const distance = 200;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;
            if (totalHeight >= scrollHeight) {
              clearInterval(timer);
              resolve();
            }
          }, 200);
        });
      });
    } catch {
      this.logger.debug('Auto scroll failed, continuing...');
    }
  }

  async handleCaptcha() {
    try {
      const captchaSelectors = [
        '[src*="captcha"]',
        '[class*="captcha"]',
        '[id*="captcha"]',
        '.recaptcha',
        '#recaptcha'
      ];
      for (const selector of captchaSelectors) {
        const el = await this.page.$(selector);
        if (el) {
          this.logger.warn('CAPTCHA detected â€” solve it manually then press Enter...');
          await new Promise(res => process.stdin.once('data', res));
          return true;
        }
      }
      return false;
    } catch {
      this.logger.debug('CAPTCHA check failed');
      return false;
    }
  }

  async checkForBlocking() {
    try {
      const title = await this.page.title();
      const blockingKeywords = [
        'access denied',
        'blocked',
        'captcha',
        'please verify',
        'security check',
        '403',
        '429'
      ];
      return blockingKeywords.some(keyword => title.toLowerCase().includes(keyword));
    } catch {
      this.logger.debug('Block check failed');
      return false;
    }
  }

  async cleanup() {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      this.logger.debug('Browser cleanup completed');
    } catch (error) {
      this.logger.error('Error during cleanup', error);
    }
  }

  getResults() {
    return {
      reviews: this.reviews,
      count: this.reviews.length,
      source: this.constructor.name.replace('Scraper', '').toLowerCase()
    };
  }
}

module.exports = BaseScraper;