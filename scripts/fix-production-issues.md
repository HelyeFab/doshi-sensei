# Production Issues Fix Guide

## 1. ✅ Firestore Indexes (COMPLETED)
The composite indexes for `visible` + `scrapedAt` have been deployed.

## 2. Backfill Existing Articles

Run this script to set `visible=true` for all existing articles:

```bash
# First, ensure you have the service account key
# Download from Firebase Console > Project Settings > Service Accounts

# Then run the backfill script
node scripts/backfill-article-visibility.js
```

## 3. Fix Scraper 502 Errors

The scrapers are getting blocked by Yahoo and Mainichi. Here are the solutions:

### Option A: Use Alternative Data Sources
Instead of scraping directly, consider using:
- RSS feeds (more reliable, less likely to be blocked)
- Official APIs where available
- News aggregator APIs

### Option B: Improve Scraper Resilience

1. **Add retry logic with exponential backoff**
2. **Rotate user agents**
3. **Add random delays between requests**
4. **Use proxy rotation**

### Option C: Temporary Workaround (Immediate)

For now, you can disable the problematic scrapers and rely on:
- NHK Easy (working)
- Watanoc (working)
- Manual article import

## 4. Monitor Article Count

Check if articles are showing after backfill:

```javascript
// In Firebase Console or using Firebase Admin SDK
const snapshot = await db.collection('articles')
  .where('visible', '==', true)
  .limit(10)
  .get();

console.log(`Found ${snapshot.size} visible articles`);
```

## 5. Scraper Headers Update

To reduce 502 errors, update scraper headers:

```javascript
// Add to all scrapers
await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

await page.setExtraHTTPHeaders({
  'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"macOS"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1'
});

// Add random delay between requests
await page.waitForTimeout(Math.random() * 3000 + 2000); // 2-5 seconds
```

## 6. Alternative: Use RSS Feeds

Many Japanese news sites provide RSS feeds:

- **Yahoo News Japan RSS**: https://news.yahoo.co.jp/rss/
- **Mainichi RSS**: https://mainichi.jp/rss/
- **NHK RSS**: https://www3.nhk.or.jp/rss/news/cat0.xml

Consider switching to RSS parsing instead of web scraping for better reliability.

## 7. Emergency Fallback

If scrapers continue to fail, temporarily use cached/static content:

1. Keep last successful scrape results
2. Show slightly older content rather than no content
3. Display a notice about temporary limitations

## Next Steps

1. **Immediate**: Run the backfill script to make existing articles visible
2. **Short-term**: Implement retry logic and better error handling in scrapers
3. **Long-term**: Consider switching to RSS feeds or official APIs

## Testing After Fixes

```bash
# Test scraper locally
node -e "require('./netlify/functions/scrape-yahoo-news').handler({}, {}, console.log)"

# Check article visibility in production
curl https://doshisensei.com/api/articles | jq '.articles | length'
```