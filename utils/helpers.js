const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');

class Helpers {
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validateDate(dateString) {
        const date = moment(dateString, 'YYYY-MM-DD', true);
        return date.isValid();
    }

    static validateUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    static cleanText(text) {
        if (!text) return '';

        return text
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .replace(/[\r\n]+/g, ' ') // Replace newlines with space
            .trim();
    }

    static sanitizeCompanyName(name) {
        if (!name) return '';

        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '') // Remove special characters
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .trim();
    }

    static parseDate(dateString) {
        if (!dateString) return null;

        // Try different date formats
        const formats = [
            'YYYY-MM-DD',
            'MM/DD/YYYY',
            'DD/MM/YYYY',
            'MMMM DD, YYYY',
            'MMM DD, YYYY',
            'DD MMM YYYY',
            'YYYY-MM-DD HH:mm:ss',
            'MM-DD-YYYY'
        ];

        for (const format of formats) {
            const date = moment(dateString, format, true);
            if (date.isValid()) {
                return date.format('YYYY-MM-DD');
            }
        }

        // Try automatic parsing
        const autoDate = moment(dateString);
        if (autoDate.isValid()) {
            return autoDate.format('YYYY-MM-DD');
        }

        return null;
    }

    static isDateInRange(dateString, startDate, endDate) {
        const date = moment(dateString);
        const start = moment(startDate);
        const end = moment(endDate);

        if (!date.isValid() || !start.isValid() || !end.isValid()) {
            return false;
        }

        return date.isBetween(start, end, null, '[]'); // inclusive
    }

    static async ensureDirectoryExists(dirPath) {
        try {
            await fs.ensureDir(dirPath);
            return true;
        } catch (error) {
            console.error(`Failed to create directory ${dirPath}:`, error.message);
            return false;
        }
    }

    static async saveToFile(data, filename) {
        try {
            const outputDir = path.join(process.cwd(), 'output');
            await this.ensureDirectoryExists(outputDir);

            const filePath = path.join(outputDir, filename);
            await fs.writeJson(filePath, data, { spaces: 2 });

            return filePath;
        } catch (error) {
            throw new Error(`Failed to save file: ${error.message}`);
        }
    }

    static generateOutputFilename(companyName, format = 'json') {
        const sanitizedName = this.sanitizeCompanyName(companyName);
        const timestamp = moment().format('YYYYMMDD_HHmmss');
        return `${sanitizedName}_reviews_${timestamp}.${format}`;
    }

    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static getRandomDelay(min = 1000, max = 3000) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    static extractRating(ratingText) {
        if (!ratingText) return null;

        // Extract number from rating text (e.g., "4.5 out of 5" -> 4.5)
        const match = ratingText.match(/(\d+(?:\.\d+)?)/);
        return match ? parseFloat(match[1]) : null;
    }

    static normalizeRating(rating, maxRating = 5) {
        if (!rating || rating < 0) return 0;
        if (rating > maxRating) return maxRating;
        return Math.round(rating * 10) / 10; // Round to 1 decimal place
    }

    static truncateText(text, maxLength = 500) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    static getUserAgent() {
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        ];

        return userAgents[Math.floor(Math.random() * userAgents.length)];
    }

    static createReviewObject(data) {
        return {
            id: data.id || null,
            title: this.cleanText(data.title) || null,
            content: this.cleanText(data.content) || null,
            rating: this.normalizeRating(data.rating) || null,
            author: this.cleanText(data.author) || null,
            date: this.parseDate(data.date) || null,
            source: data.source || null,
            pros: this.cleanText(data.pros) || null,
            cons: this.cleanText(data.cons) || null,
            scraped_at: moment().format('YYYY-MM-DD HH:mm:ss')
        };
    }

    static logScrapingStats(stats) {
        console.log('\n' + '='.repeat(50));
        console.log('SCRAPING STATISTICS');
        console.log('='.repeat(50));
        console.log(`Total Reviews Collected: ${stats.totalReviews}`);
        console.log(`Sources Scraped: ${stats.sources.join(', ')}`);
        console.log(`Date Range: ${stats.startDate} to ${stats.endDate}`);
        console.log(`Processing Time: ${stats.processingTime}`);
        console.log(`Success Rate: ${stats.successRate}%`);
        if (stats.errors && stats.errors.length > 0) {
            console.log(`Errors Encountered: ${stats.errors.length}`);
        }
        console.log('='.repeat(50));
    }
}

module.exports = Helpers;
