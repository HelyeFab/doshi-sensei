# Automated News Scraping Setup

## Overview

This document explains the automated daily news scraping functionality for Doshi Sensei. The system now supports both manual triggering (via admin dashboard) and automated daily scraping.

## What's New

### 1. Hybrid Scraping Function
- **File**: `/netlify/functions/scrape-news-scheduled.js`
- **Purpose**: Combines all three news sources (NHK Easy, Watanoc, Todaii) into one function
- **Features**:
  - Supports both HTTP requests (manual) and scheduled triggers (automated)
  - Scrapes all three sources in parallel for efficiency
  - Adds `scheduledScrape: true` flag to distinguish automated articles

### 2. Scheduled Configuration
- **File**: `netlify.toml`
- **Schedule**: Daily at 6 AM JST (9 PM UTC)
- **Cron Expression**: `0 21 * * *`

## How It Works

### Automated Scraping (Daily)
1. Netlify triggers the function at the scheduled time
2. Function detects it's a scheduled invocation (no HTTP method)
3. Scrapes all three news sources
4. Saves articles to Firebase with `scheduledScrape: true`
5. No HTTP response needed

### Manual Scraping (Admin Dashboard)
1. Admin dashboard makes HTTP request to same function
2. Function detects HTTP request
3. Handles CORS preflight
4. Performs same scraping logic
5. Returns HTTP response with results

## Key Implementation Details

### Trigger Detection
```javascript
// Check if this is a scheduled invocation
const isScheduled = event.httpMethod === undefined || event.httpMethod === null;
```

### Dual Response Handling
- **Scheduled**: Returns simple result object
- **HTTP**: Returns proper HTTP response with headers

### Article Flagging
```javascript
batch.set(docRef, {
  ...article,
  scraped: true,
  scheduledScrape: true  // Indicates automated scraping
});
```

## Testing

### Local Testing (Scheduled Function)
```bash
# Simulate scheduled invocation
netlify functions:invoke scrape-news-scheduled --no-identity
```

### Local Testing (HTTP Request)
```bash
# Simulate HTTP request
curl http://localhost:8888/.netlify/functions/scrape-news-scheduled
```

### Production Testing
- **Automated**: Will run daily at 6 AM JST
- **Manual**: Use admin dashboard or:
  ```bash
  curl https://your-site.netlify.app/.netlify/functions/scrape-news-scheduled
  ```

## Monitoring

### Check Netlify Function Logs
1. Go to Netlify Dashboard
2. Navigate to Functions tab
3. Click on `scrape-news-scheduled`
4. View execution logs

### Firebase Verification
- Check for articles with `scheduledScrape: true`
- Monitor article creation timestamps
- Verify all three sources are being scraped

## Troubleshooting

### Function Not Running
1. Verify function exists in Netlify dashboard
2. Check schedule syntax in `netlify.toml`
3. Ensure Firebase credentials are set in environment variables

### Partial Scraping
- Check individual source websites for changes
- Review function timeout (currently 30 seconds)
- Monitor source-specific error logs

### Time Zone Issues
- Schedule uses UTC time
- 6 AM JST = 9 PM UTC (previous day)
- Adjust `schedule` in `netlify.toml` if needed

## Customization

### Change Schedule Time
Edit `netlify.toml`:
```toml
[functions."scrape-news-scheduled"]
  schedule = "0 21 * * *"  # Change this cron expression
```

### Add Multiple Daily Runs
Uncomment alternative schedules in `netlify.toml`:
```toml
[functions."scrape-news-morning"]
  schedule = "0 21 * * *"  # 6 AM JST

[functions."scrape-news-evening"]
  schedule = "0 9 * * *"   # 6 PM JST
```

### Adjust Sources
Modify the scraping functions in `scrape-news-scheduled.js`:
- Comment out unwanted sources in `Promise.all()`
- Add new scraping functions
- Adjust article limits per source

## Migration Notes

### From Manual to Automated
- Existing manual functions remain unchanged
- Admin dashboard continues to work
- Automated scraping is additive, not replacement

### Identifying Article Source
Query Firebase for automated articles:
```javascript
db.collection('articles')
  .where('scheduledScrape', '==', true)
  .orderBy('createdAt', 'desc')
  .limit(10)
```

## Best Practices

1. **Monitor First Week**: Check logs daily initially
2. **Error Alerts**: Set up Netlify function error notifications
3. **Backup Plan**: Keep manual scraping as fallback
4. **Content Validation**: Periodically verify article quality
5. **Performance**: Monitor function execution time

## Future Enhancements

1. **Error Recovery**: Retry failed sources individually
2. **Duplicate Detection**: Prevent re-scraping same articles
3. **Smart Scheduling**: Adjust times based on source update patterns
4. **Metrics Collection**: Track scraping success rates
5. **Content Validation**: AI-powered quality checks

---

Last Updated: January 2025