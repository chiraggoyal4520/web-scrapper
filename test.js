const fs = require('fs-extra');
const path = require('path');

class SystemTester {
    constructor() {
        this.passed = 0;
        this.failed = 0;
    }

    async runTests() {
        console.log('🧪 Running SaaS Reviews Scraper System Tests\n');

        await this.testNodeJsVersion();
        await this.testRequiredDependencies();
        await this.testDirectoryStructure();
        await this.testFilePermissions();
        await this.testBasicFunctionality();

        this.printResults();
        return this.failed === 0;
    }

    async testNodeJsVersion() {
        try {
            const version = process.version;
            const majorVersion = parseInt(version.slice(1).split('.')[0]);

            if (majorVersion >= 16) {
                this.pass(`Node.js version: ${version} ✅`);
            } else {
                this.fail(`Node.js version: ${version} (requires >= 16.0.0) ❌`);
            }
        } catch (error) {
            this.fail(`Node.js version check failed: ${error.message} ❌`);
        }
    }

    async testRequiredDependencies() {
        const dependencies = [
            'puppeteer',
            'commander', 
            'fs-extra',
            'moment'
        ];

        for (const dep of dependencies) {
            try {
                require(dep);
                this.pass(`Dependency ${dep}: Found ✅`);
            } catch (error) {
                this.fail(`Dependency ${dep}: Missing ❌`);
                console.log(`   Run: npm install ${dep}`);
            }
        }
    }

    async testDirectoryStructure() {
        const requiredPaths = [
            './utils',
            './scrapers',
            './utils/logger.js',
            './utils/helpers.js',
            './scrapers/base-scraper.js',
            './scrapers/g2-scraper.js',
            './scrapers/capterra-scraper.js',
            './scrapers/trustradius-scraper.js',
            './index.js',
            './package.json'
        ];

        for (const filePath of requiredPaths) {
            try {
                const exists = await fs.pathExists(filePath);
                if (exists) {
                    this.pass(`File/Directory ${filePath}: Found ✅`);
                } else {
                    this.fail(`File/Directory ${filePath}: Missing ❌`);
                }
            } catch (error) {
                this.fail(`File check ${filePath}: Error ${error.message} ❌`);
            }
        }
    }

    async testFilePermissions() {
        try {
            // Test if we can create the output directory
            const outputDir = path.join(process.cwd(), 'output');
            await fs.ensureDir(outputDir);

            // Test if we can write files
            const testFile = path.join(outputDir, 'test_permissions.json');
            await fs.writeJson(testFile, { test: true });
            await fs.remove(testFile);

            this.pass('File permissions: Write access OK ✅');
        } catch (error) {
            this.fail(`File permissions: Cannot write files ❌`);
            console.log(`   Error: ${error.message}`);
        }
    }

    async testBasicFunctionality() {
        try {
            // Test logger
            const Logger = require('./utils/logger');
            const logger = new Logger(false);
            logger.info('Test message');
            this.pass('Logger functionality: Working ✅');

            // Test helpers
            const Helpers = require('./utils/helpers');
            const testDate = Helpers.parseDate('2024-01-01');
            if (testDate === '2024-01-01') {
                this.pass('Helpers functionality: Working ✅');
            } else {
                this.fail('Helpers functionality: Date parsing failed ❌');
            }

            // Test scraper classes can be imported
            const BaseScraper = require('./scrapers/base-scraper');
            const G2Scraper = require('./scrapers/g2-scraper');
            const CapterraScraper = require('./scrapers/capterra-scraper');
            const TrustRadiusScraper = require('./scrapers/trustradius-scraper');

            this.pass('Scraper classes: All importable ✅');

            // Test main scraper class
            const SaaSReviewsScraper = require('./index');
            const scraper = new SaaSReviewsScraper();

            this.pass('Main scraper class: Working ✅');

        } catch (error) {
            this.fail(`Basic functionality test failed: ${error.message} ❌`);
        }
    }

    pass(message) {
        console.log(`✅ ${message}`);
        this.passed++;
    }

    fail(message) {
        console.log(`❌ ${message}`);
        this.failed++;
    }

    printResults() {
        console.log('\n' + '='.repeat(50));
        console.log('TEST RESULTS');
        console.log('='.repeat(50));
        console.log(`✅ Passed: ${this.passed}`);
        console.log(`❌ Failed: ${this.failed}`);
        console.log(`📊 Total: ${this.passed + this.failed}`);

        if (this.failed === 0) {
            console.log('\n🎉 All tests passed! Your scraper is ready to use.\n');
            console.log('Quick start:');
            console.log('  node index.js -c "Slack" -s "g2" --start-date "2024-01-01" --end-date "2024-12-31" --limit 10');
        } else {
            console.log('\n⚠️  Some tests failed. Please fix the issues above before using the scraper.\n');
            console.log('Common fixes:');
            console.log('  1. Run: npm install');
            console.log('  2. Check Node.js version: node --version');
            console.log('  3. Ensure all files are present');
        }
        console.log('='.repeat(50));
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new SystemTester();
    tester.runTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test runner failed:', error);
        process.exit(1);
    });
}

module.exports = SystemTester;
