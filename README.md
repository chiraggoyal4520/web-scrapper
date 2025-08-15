# SaaS Reviews Scraper

A comprehensive Node.js application that scrapes product reviews from major SaaS review platforms including G2, Capterra, and TrustRadius.

## 🚀 Features

- **Multi-platform support**: Scrapes from G2, Capterra, and TrustRadius
- **Smart search**: Automatically finds product pages when given company names
- **Date filtering**: Collect reviews within specific date ranges
- **Rate limiting**: Ethical scraping with configurable delays
- **Anti-bot handling**: Handles CAPTCHAs and blocking attempts
- **Structured output**: Clean JSON format with standardized review data
- **CLI interface**: Easy-to-use command-line interface
- **Error handling**: Robust error handling with retry mechanisms
- **Headless/headed modes**: Option to see browser in action for debugging

## 📋 Requirements

- **Node.js**: Version 16.0.0 or higher
- **npm**: Comes bundled with Node.js
- **Operating System**: Windows, macOS, or Linux

## 🛠️ Installation

1. **Clone or download the project files**

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Test the installation**:
   ```bash
   node test.js
   ```

## 🎯 Quick Start

### Basic Usage

```bash
# Scrape G2 reviews for Slack from 2024
node index.js -c "Slack" -s "g2" --start-date "2024-01-01" --end-date "2024-12-31" --limit 50
```

### Scrape All Sources

```bash
# Scrape from all sources (G2, Capterra, TrustRadius)
node index.js -c "Microsoft Teams" -s "all" --start-date "2024-01-01" --end-date "2024-12-31" --limit 100
```

### Debug Mode

```bash
# Run with visible browser and verbose logging
node index.js -c "Zoom" -s "g2" --start-date "2024-01-01" --end-date "2024-12-31" --verbose --headless false --limit 10
```

## 📖 Command Line Options

| Option | Short | Description | Default |
|--------|--------|-------------|---------|
| `--company` | `-c` | **Required.** Company name to search for | - |
| `--source` | `-s` | Source to scrape (`g2`, `capterra`, `trustradius`, `all`) | `g2` |
| `--url` | `-u` | Direct URL to scrape (optional) | - |
| `--start-date` | - | Start date for reviews (YYYY-MM-DD) | - |
| `--end-date` | - | End date for reviews (YYYY-MM-DD) | - |
| `--limit` | `-l` | Maximum number of reviews to collect | `100` |
| `--delay` | `-d` | Delay between requests (milliseconds) | `2000` |
| `--timeout` | `-t` | Page load timeout (milliseconds) | `30000` |
| `--headless` | - | Run browser in headless mode (`true`/`false`) | `true` |
| `--verbose` | - | Enable verbose logging | `false` |
| `--block-resources` | - | Block images/CSS for faster loading | `false` |

## 📁 Project Structure

```
saas-reviews-scraper/
├── package.json                 # Project dependencies and metadata
├── index.js                     # Main CLI application
├── test.js                      # System tests
├── README.md                    # This file
├── utils/
│   ├── logger.js               # Logging utility
│   └── helpers.js              # Helper functions
├── scrapers/
│   ├── base-scraper.js         # Base scraper class
│   ├── g2-scraper.js           # G2-specific implementation
│   ├── capterra-scraper.js     # Capterra-specific implementation
│   └── trustradius-scraper.js  # TrustRadius-specific implementation
└── output/                     # Generated review files (created automatically)
```

## 📊 Output Format

Reviews are saved as JSON files in the `./output/` directory with the following structure:

```json
[
  {
    "id": "g2_1_1692000000000",
    "title": "Great tool for team communication",
    "content": "We've been using this software for 2 years and it's been excellent...",
    "rating": 4.5,
    "author": "John D.",
    "date": "2024-03-15",
    "source": "G2",
    "url": "https://www.g2.com/products/slack/reviews",
    "helpful_count": 12,
    "verified": true,
    "company_size": "51-200 employees",
    "industry": "Software",
    "pros": "Easy to use, great integrations",
    "cons": "Can be noisy with notifications",
    "scraped_at": "2025-08-14 09:00:00"
  }
]
```

## 🔍 Supported Platforms

### G2 (www.g2.com)
- **Strengths**: Largest database, verified reviews, detailed company info
- **Challenges**: Strong anti-bot measures, JavaScript-heavy
- **Data Quality**: High (verified reviewers, detailed profiles)

### Capterra (www.capterra.com)
- **Strengths**: Good coverage of SMB software, clean layout
- **Challenges**: Less detailed reviewer information
- **Data Quality**: Medium-High (some verification, good content)

### TrustRadius (www.trustradius.com)
- **Strengths**: Enterprise focus, detailed reviewer profiles
- **Challenges**: Smaller database, complex navigation
- **Data Quality**: High (detailed reviewer info, enterprise focus)

## 🛡️ Ethical Scraping Guidelines

This scraper follows ethical web scraping practices:

- **Respects robots.txt**: Checks and follows robots.txt directives
- **Rate limiting**: Configurable delays between requests (default 2 seconds)
- **Resource blocking**: Option to block images/CSS to reduce server load
- **Error handling**: Graceful failure handling to avoid overwhelming servers
- **User agent rotation**: Uses realistic browser user agents

### ⚖️ Legal Considerations

**Important**: Before using this scraper, please:

1. **Review Terms of Service** for each platform you plan to scrape
2. **Use for legitimate purposes** such as market research or competitor analysis
3. **Respect rate limits** and don't overwhelm servers
4. **Consider API alternatives** - check if the platform offers official APIs
5. **Be mindful of copyright** - don't republish copyrighted content without permission

## 🔧 Troubleshooting

### Common Issues

#### "node: command not found"
**Solution**: Install Node.js from [nodejs.org](https://nodejs.org)

#### "Cannot find module 'puppeteer'"
**Solution**: Run `npm install` in the project directory

#### No reviews found
**Possible causes**:
- Incorrect company name spelling
- Date range too narrow
- Site structure changed

**Solutions**:
- Use exact company name from the review sites
- Widen date range
- Run with `--verbose --headless false` to debug

#### Getting blocked by websites
**Solutions**:
- Increase delay: `--delay 5000`
- Use non-headless mode: `--headless false`
- Try different user agents or add proxy support

#### Permission denied errors
**Solution (Mac/Linux)**: 
```bash
sudo npm install
```

### Debug Mode

Run with debug options to see what's happening:

```bash
node index.js -c "Slack" -s "g2" --start-date "2024-01-01" --end-date "2024-12-31" --verbose --headless false --limit 5
```

This will:
- Show the browser window
- Display detailed logs
- Help identify where scraping fails

## 📈 Performance Tips

### Optimize Speed
- Use `--block-resources` to skip images and CSS
- Reduce `--limit` for testing
- Use single source (`-s g2`) instead of `all`

### Avoid Getting Blocked
- Increase `--delay` (try 3000-5000ms)
- Use `--headless false` to appear more human-like
- Don't run too many concurrent instances

### Large Scale Scraping
- Use proxy rotation (modify scrapers to add proxy support)
- Implement session management
- Add more sophisticated retry logic

## 🔄 Customization

### Adding New Sources

1. Create a new scraper class in `./scrapers/`:
   ```javascript
   const BaseScraper = require('./base-scraper');

   class NewSiteScraper extends BaseScraper {
       // Implement required methods
   }
   ```

2. Add to the main scraper in `index.js`

### Modifying Data Extraction

Edit the `extractReviews` method in each scraper to change what data is collected.

### Custom Output Formats

Modify the `processResults` method in `index.js` to change output format (CSV, XML, etc.).

## 📝 Examples

### Example 1: Market Research
```bash
# Compare reviews across all platforms for a specific date range
node index.js -c "Salesforce" -s "all" --start-date "2024-01-01" --end-date "2024-06-30" -l 500
```

### Example 2: Competitor Analysis
```bash
# Get recent reviews for multiple competitors
node index.js -c "HubSpot" -s "g2" --start-date "2024-01-01" --end-date "2024-12-31" -l 200
node index.js -c "Pipedrive" -s "g2" --start-date "2024-01-01" --end-date "2024-12-31" -l 200
```

### Example 3: Quality Assessment
```bash
# Deep dive into one source with debug mode
node index.js -c "Zoom" -s "trustradius" --start-date "2024-01-01" --end-date "2024-12-31" --verbose --headless false -l 100
```

## 🤝 Contributing

Contributions are welcome! Areas for improvement:

- **Additional sources**: Implement scrapers for Software Advice, GetApp, etc.
- **Enhanced anti-bot measures**: Add more sophisticated detection avoidance
- **Data enrichment**: Add sentiment analysis, categorization
- **API integrations**: Connect to CRM or analytics platforms
- **Performance optimization**: Parallel processing, better error recovery

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This tool is provided for educational and research purposes only. Users are responsible for ensuring their use complies with the terms of service of the websites being scraped and all applicable laws and regulations. The authors are not responsible for any misuse of this software.

## 🆘 Support

If you encounter issues:

1. **Run the test suite**: `node test.js`
2. **Check the logs**: Use `--verbose` flag
3. **Review this README**: Many issues are covered in troubleshooting
4. **Create an issue**: Provide detailed error messages and steps to reproduce

---

**Happy Scraping! 🚀**
