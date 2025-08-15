# SaaS Reviews Scraper (G2 Only)

A Node.js application to scrape SaaS product reviews **exclusively from G2**.

## 🚀 Features

- **G2-only**: Focused solely on high-quality reviews from G2.
- **Smart search**: Finds product pages from company names automatically.
- **Date filtering**: Collect reviews within specific date ranges.
- **Rate limiting**: Ethical scraping with configurable delays.
- **Anti-bot handling**: Handles CAPTCHAs and blocking attempts.
- **Structured output**: Clean JSON format with standardized review data.
- **CLI interface**: Easy-to-use command-line tool.
- **Error handling**: Robust retry and error handling.
- **Headless / headed modes**: Watch the browser for debugging.

## 📋 Requirements

- **Node.js**: v16.0.0 or higher
- **npm**: Included with Node.js
- **OS**: Windows, macOS, or Linux

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

***

## 🎯 Quick Start

### Basic Usage
```bash
# Scrape G2 reviews for Slack from 2025
node index.js -c "Slack" --start-date "2025-08-01" --end-date "2025-08-31" --headless false --limit 50
```

### Debug Mode
```bash
# Run with visible browser and verbose logging
node index.js -c "Zoom" --verbose --headless false --limit 10
```

***



## 📖 Command Line Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--company` | `-c` | **Required.** Company name to search | - |
| `--url` | `-u` | Direct G2 product reviews URL (optional) | - |
| `--start-date` |  | Filter reviews from this date (YYYY-MM-DD) | - |
| `--end-date` |  | Filter reviews until this date (YYYY-MM-DD) | - |
| `--proxy` |  | Proxy server URL | - |
| `--limit` | `-l` | Max reviews to collect | `100` |
| `--delay` | `-d` | Delay between requests (ms) | `2000` |
| `--timeout` | `-t` | Page load timeout (ms) | `30000` |
| `--headless` |  | Run in headless mode (`true`/`false`) | `true` |
| `--verbose` |  | Enable verbose logging | `false` |
| `--block-resources` |  | Block images/CSS for faster loading | `false` |

## 📂 Project Structure


```
saas-reviews-scraper/
├── package.json
├── index.js
├── test.js
├── README.md
├── utils/
│ ├── logger.js
│ └── helpers.js
├── scrapers/
│ └── g2-scraper.js
└── output/
```

***


## 📊 Output Format

Reviews are saved as JSON files in `./output/` with the following structure:


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

***

## 🔍 Supported Platform

### G2 (www.g2.com)
- **Strengths**: Largest database, verified reviews, detailed company info.
- **Challenges**: Strong anti-bot measures, JavaScript-heavy.
- **Data Quality**: High (verified reviewers, detailed profiles).

***


## 🛡️ Ethical Scraping Guidelines

- Respect `robots.txt` and Terms of Service.
- Use configurable delays (`--delay`) to avoid hammering servers.
- Block unnecessary resources with `--block-resources` to reduce load.
- Use realistic browser user agents.
- Only use for legitimate, ethical purposes (research, analysis, etc.).

## 🔧 Troubleshooting

### "No reviews found"
- Check company name spelling.
- Widen your date range.
- Run in verbose / visible browser mode:

  ```bash
  node index.js -c "Slack" --verbose --headless false --limit 5
  ```


### Getting blocked
- Increase delay: `--delay 5000`.
- Use non-headless mode.
- Add proxy support if needed.

## 📈 Performance Tips

- Use `--block-resources` to increase speed.
- Lower `--limit` during testing.
- Increase delays to avoid getting blocked.

## 📝 Examples

### Get 50 recent G2 reviews for Zoom

```bash
node index.js -c "Zoom" --start-date "2024-01-01" --end-date "2024-12-31" -l 50
```

### Debug mode while scraping 10 reviews
```bash
node index.js -c "Slack" --verbose --headless false -l 10
```

***


## 📄 License

MIT License – see LICENSE file.

## ⚠️ Disclaimer

This tool is for **educational and research purposes only**. You are responsible for ensuring compliance with G2’s Terms of Service and applicable laws.

## 🆘 Support

1. Run `node test.js`
2. Check logs with `--verbose`
3. If issues persist, open an issue with detailed logs.

**Happy Scraping! 🚀**