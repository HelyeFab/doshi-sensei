# News Scraping Functions

This directory contains serverless functions for scraping Japanese news articles from various sources.

## Overview

We have two versions of each scraper:
1. **Standard version** - Uses fetch() and Cheerio for HTML parsing
2. **Puppeteer version** - Uses headless Chrome for JavaScript-rendered content

## Available Scrapers

### NHK Easy
- **Standard**: `scrape-nhk-easy.js` - Uses NHK's JSON API when available
- **Puppeteer**: `scrape-nhk-easy-puppeteer.js` - Better for dynamic content
- **Difficulty**: N5 (Beginner)
- **Source**: https://www3.nhk.or.jp/news/easy/

### Todaii
- **Standard**: `scrape-todaii-next.js` - Uses Cheerio for article extraction
- **Puppeteer**: `scrape-todaii-puppeteer.js` - Handles JavaScript-rendered pages
- **Difficulty**: N3 (Intermediate)
- **Source**: https://japanese.todaiinews.com

### Watanoc
- **Standard**: `scrape-watanoc-next.js` - Regex-based extraction
- **Puppeteer**: `scrape-watanoc-puppeteer.js` - Better content extraction
- **Difficulty**: Variable (N1-N5)
- **Source**: https://watanoc.com

## Testing Locally

1. Start Netlify Dev:
   ```bash
   npm run dev:netlify
   ```

2. Test individual scrapers:
   ```bash
   # Test standard version
   curl http://localhost:9999/.netlify/functions/scrape-nhk-easy

   # Test Puppeteer version
   curl http://localhost:9999/.netlify/functions/scrape-nhk-easy-puppeteer
   ```

3. Or use the test script:
   ```bash
   node scripts/test-scrapers.js
   ```

## Deployment Notes

### Puppeteer on Netlify
The Puppeteer scrapers use `@sparticuz/chromium` which is optimized for serverless environments. The `prebuild` script in package.json ensures Chrome is installed during deployment.

### Memory Configuration
Puppeteer functions are configured with 1024MB memory in `netlify.toml`:
```toml
[functions."scrape-nhk-easy-puppeteer"]
  memory = 1024
```

### Environment Variables
Required environment variables:
- `FIREBASE_*` - Firebase Admin SDK credentials
- `UNSPLASH_ACCESS_KEY` - For fallback images (optional)

## Scheduled Scraping

The `scrape-news-scheduled.js` function runs daily at 6 AM JST (configured in netlify.toml) and triggers all standard scrapers.

## Article Structure

All scrapers save articles with this structure:
```javascript
{
  id: string,
  title: string,
  content: string,
  summary: string,
  url: string,
  imageUrl: string,
  publishDate: Date,
  scrapedAt: Date,
  source: {
    id: string,
    name: string,
    displayName: string
  },
  category: string,
  tags: string[],
  difficulty: string, // N1-N5
  estimatedReadingTime: number,
  vocabulary: array,
  kanji: array
}
```

## Troubleshooting

### "Scrambled text" issue
If scrapers return placeholder or scrambled text:
1. Check if the site uses JavaScript rendering (use Puppeteer version)
2. Verify CSS selectors haven't changed
3. Check for rate limiting or blocking

### Timeout issues
- Standard scrapers have 25-30 second timeouts
- Puppeteer scrapers have 55 second timeouts (Netlify max is 60s)
- Adjust timeouts in the Promise.race() calls if needed

### Memory issues
If Puppeteer functions fail with memory errors:
1. Increase memory in netlify.toml
2. Reduce number of articles scraped per run
3. Close browser pages promptly