# Netlify Functions Cleanup Summary
Date: August 5, 2025

## Functions Removed (Backed up in this directory)

### Debug Functions
- debug-article-content.js
- debug-mainichi-content.js
- debug-nhk-todaii.js
- debug-watanoc.js

### Test Functions
- test-mainichi-detailed.js
- test-mainichi-scraper.js
- test-nhk-direct.js
- test-scraper-content.js
- test-watanoc-content.js

### Deprecated/Duplicate Scrapers
- scrape-nhk-easy-fixed.js
- scrape-nhk-easy-puppeteer.js
- scrape-todaii-enhanced.js
- scrape-todaii-puppeteer.js
- scrape-watanoc-enhanced.js
- scrape-watanoc-puppeteer.js
- scrape-news-scheduled.js (replaced by scrape-news-scheduled-enhanced.js)

### Other Unused
- show-scraped-content.js
- api-stripe-webhook.js (moved to Firestore)

## Functions Kept (Currently in Production)

### Core Scrapers
- scrape-watanoc-next.js
- scrape-todaii-next.js
- scrape-nhk-easy.js
- scrape-nhk-improved.js
- scrape-yahoo-news.js
- scrape-mainichi-shogakusei.js
- scrape-mainichi-news.js

### Scheduled Function
- scrape-news-scheduled-enhanced.js (runs daily at 6 AM JST)

### Utilities
- article-deduplication.js

## Note
The following functions referenced in code were not found in the functions directory and may need to be created or the references updated:
- jisho-proxy (referenced in api.ts)
- scrape-watanoc-diagnostic (used in admin panel)
- delete-test-articles (used in admin panel)
- emails (system function)

## Restoration
To restore any function, simply copy it back from this backup directory:
```bash
cp _backup_20250805/function-name.js ../
```