# Articles Database Migration Plan

## Overview
Complete plan for transitioning from current articles database (with English content) to a clean, validated Japanese-only database.

## Current State
- Mixed Japanese and English articles in database
- No validation on scraping
- Existing users have bookmarks/progress on current articles

## Target State
- Japanese-only articles
- All articles validated before saving
- Quality scores and AI enhancement applied
- Clean, high-quality content for learning

## Migration Strategy

### Phase 1: Testing (Before Deployment)
1. **Local Testing of Scrapers**
   ```bash
   # Test each scraper locally
   netlify dev
   
   # Test individual scrapers
   netlify functions:invoke scrape-watanoc-next
   netlify functions:invoke scrape-todaii-next
   netlify functions:invoke scrape-nhk-easy
   netlify functions:invoke scrape-nhk-improved
   netlify functions:invoke scrape-yahoo-news
   netlify functions:invoke scrape-mainichi-news
   netlify functions:invoke scrape-mainichi-shogakusei
   ```

2. **Verify Validation Works**
   - Check console logs for filtering statistics
   - Confirm English articles are rejected
   - Verify Japanese content passes

### Phase 2: Backup Current Data
```javascript
// Run this script to backup current articles
const admin = require('firebase-admin');
const fs = require('fs');

async function backupArticles() {
  const snapshot = await admin.firestore()
    .collection('articles')
    .get();
  
  const articles = [];
  snapshot.forEach(doc => {
    articles.push({
      id: doc.id,
      ...doc.data()
    });
  });
  
  // Save to file with timestamp
  const filename = `articles-backup-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(articles, null, 2));
  console.log(`Backed up ${articles.length} articles to ${filename}`);
}
```

### Phase 3: Clean Database Preparation

#### Option A: Complete Fresh Start (Recommended)
1. Export user data (bookmarks, progress)
2. Delete all articles
3. Deploy new scrapers
4. Let database refill with validated content

#### Option B: Gradual Transition
1. Mark all existing articles with `legacy: true`
2. Deploy new scrapers (new articles get `legacy: false`)
3. Run validation on legacy articles
4. Delete low-quality legacy articles over time

### Phase 4: Deployment Steps

1. **Deploy Updated Scrapers**
   ```bash
   git add netlify/functions/
   git commit -m "feat: Add Japanese validation to all scrapers"
   git push
   ```

2. **Monitor Initial Scraping**
   - Watch Netlify Functions logs
   - Check filtering statistics
   - Verify only Japanese content saved

3. **Enable Scheduled Validation**
   - Already configured in netlify.toml
   - Runs hourly to process articles
   - Enhances and scores content

### Phase 5: Clean Existing Database

If choosing Option A (Fresh Start):
```javascript
// Delete all articles (run in Firebase console or admin script)
async function clearArticles() {
  const batch = admin.firestore().batch();
  const snapshot = await admin.firestore()
    .collection('articles')
    .limit(500) // Process in batches
    .get();
  
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  console.log(`Deleted ${snapshot.size} articles`);
  
  // Repeat if more articles exist
  if (snapshot.size === 500) {
    await clearArticles();
  }
}
```

### Phase 6: Post-Migration Monitoring

1. **Check Article Quality**
   - Visit `/admin/test-article-filtering`
   - Monitor Japanese vs English ratio
   - Should be 100% Japanese

2. **Monitor Validation Runs**
   - Check `validationRuns` collection in Firestore
   - Monitor enhancement statistics
   - Track quality score improvements

3. **User Impact**
   - Monitor user feedback
   - Check if article availability is sufficient
   - Ensure scraping keeps up with demand

## Rollback Plan

If issues occur:
1. Restore from backup JSON
2. Revert scraper code changes
3. Disable scheduled validation in netlify.toml

## Timeline

- **Day 1**: Local testing, backup data
- **Day 2**: Deploy scrapers, monitor
- **Day 3**: Clear old articles (if Option A)
- **Day 4-7**: Monitor and adjust
- **Week 2**: Full validation coverage

## Success Metrics

- ✅ 0% English articles in database
- ✅ 100% articles have quality scores
- ✅ Average quality score > 60
- ✅ Daily scraping provides 20+ new articles
- ✅ User satisfaction maintained/improved

## Commands Summary

```bash
# Test locally
netlify dev
netlify functions:invoke [function-name]

# Deploy
git push

# Monitor
netlify functions:log [function-name]

# Access admin tools
/admin/test-article-filtering
/admin/test-article-validation
```

## Important Notes

1. **Scraping Times**: Functions have 55-second timeout limit
2. **Validation Adds**: ~100ms per article during scraping
3. **AI Validation**: Runs separately, won't affect scraping
4. **Cost**: AI validation uses OpenAI credits (monitor usage)

## Contact for Issues
- Check Netlify Functions logs
- Monitor Firebase console
- Review validation statistics in admin panel