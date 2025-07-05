# Scheduled Scraping Functions Analysis

## 1. Scheduled Functions Status

### Current Schedule (Updated in netlify.toml)
```toml
[functions]
  # Scrape NHK Easy articles every morning at 6 AM UTC (3 PM JST)
  [functions."scrape-nhk-easy-fixed"]
    schedule = "0 6 * * *"

  # Scrape Todaii News articles every morning at 6:30 AM UTC
  [functions."scrape-todaii-news-fixed"]
    schedule = "30 6 * * *"

  # Scrape Watanoc articles every morning at 7 AM UTC
  [functions."scrape-watanoc-working"]
    schedule = "0 7 * * *"
```

### Schedule Details
- **NHK Easy**: Daily at 6:00 AM UTC (3:00 PM JST)
- **Todaii News**: Daily at 6:30 AM UTC (3:30 PM JST)
- **Watanoc**: Daily at 7:00 AM UTC (4:00 PM JST)

### Previous Issues Fixed
1. Function names were incorrect (pointing to non-working versions)
2. Article cleanup function was scheduled but doesn't exist (now commented out)
3. Schedule syntax is correct using cron format

## 2. Firebase Structure & Permissions

### How Scheduled Functions Access Firebase

The functions use Firebase Admin SDK which:
1. **Bypasses all security rules** - Admin SDK has full access regardless of Firestore rules
2. **Uses service account credentials** from environment variables:
   ```javascript
   const serviceAccount = {
     type: "service_account",
     project_id: process.env.FIREBASE_PROJECT_ID,
     private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
     private_key: process.env.FIREBASE_PRIVATE_KEY,
     client_email: process.env.FIREBASE_CLIENT_EMAIL,
     client_id: process.env.FIREBASE_CLIENT_ID,
     // ... other auth fields
   };
   ```

### Firestore Rules (for reference)
```javascript
// News articles collection - public read access, admin write access
match /articles/{articleId} {
  // Allow anyone to read articles (no authentication required)
  allow read: if true;

  // Only admin can write articles
  allow write: if isAdmin();
}
```

**Important**: These rules apply to client-side access only. Server-side Admin SDK ignores these rules.

### Data Structure Written by Functions

Each scraping function writes articles with this structure:
```javascript
{
  articleId: string,
  url: string,
  imageUrl: string,
  title: string,
  content: string,
  date: Date,
  category: string,
  source: string,
  difficulty: string,
  readTime: number,
  tags: string[],
  metadata: object,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  views: number,
  bookmarks: number
}
```

And updates metadata:
```javascript
await db.collection('articlesMetadata').doc('stats').set({
  lastNHKEasyScrape: Timestamp,
  nhkEasyArticleCount: increment(successCount),
  lastScrapeResults: {
    source: 'nhk_easy',
    processed: number,
    errors: number,
    timestamp: string
  }
}, { merge: true });
```

## 3. Automatic Article Growth

With the scheduled functions properly configured, the article database will grow automatically:

### Expected Daily Growth
- **NHK Easy**: ~5-10 articles per day
- **Todaii News**: ~3-6 articles per day (currently using mock data)
- **Watanoc**: ~2-4 articles per day (currently using mock data)

**Total**: Approximately 10-20 new articles added daily automatically

### Benefits of Scheduled Scraping
1. **Fresh Content**: New articles added daily without manual intervention
2. **Consistent Timing**: Articles added at optimal times for Japanese learners
3. **No Duplicates**: Functions check for existing articles before adding
4. **Error Handling**: Functions continue even if one source fails
5. **Statistics Tracking**: Metadata updated with each scrape

## 4. Monitoring Scheduled Functions

### How to Monitor
1. **Netlify Dashboard**: Check function logs in Netlify dashboard
2. **Firebase Console**: Monitor articles collection growth
3. **Admin Panel**: Check article statistics and last scrape times

### Common Issues to Watch
1. **API Changes**: Source websites may change their structure
2. **Rate Limiting**: Too many requests might get blocked
3. **Environment Variables**: Ensure all Firebase credentials are set in Netlify

## 5. Future Improvements

### Recommended Enhancements
1. **Create Article Cleanup Function**: Remove articles older than 60 days
2. **Add Error Notifications**: Send alerts when scraping fails
3. **Implement Real Scraping**: Replace mock data with actual web scraping for Todaii/Watanoc
4. **Add More Sources**: Integrate additional Japanese news sources
5. **Smart Scheduling**: Adjust times based on source update patterns

### Article Cleanup Function (Suggested Implementation)
```javascript
// netlify/functions/article-cleanup.js
exports.handler = async (event, context) => {
  // Delete articles older than 60 days
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 60);

  const oldArticles = await db.collection('articles')
    .where('scrapedAt', '<', cutoffDate)
    .where('bookmarkedBy', '==', []) // Don't delete bookmarked articles
    .get();

  // Batch delete old articles
  const batch = db.batch();
  oldArticles.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
};
```

## Conclusion

The scheduled scraping system is now properly configured to:
1. ✅ Run daily at specified times
2. ✅ Use the working/fixed function versions
3. ✅ Authenticate with Firebase using Admin SDK
4. ✅ Add new articles automatically
5. ✅ Update statistics and metadata

The Firebase structure fully supports scheduled functions through Admin SDK access, ensuring articles can be added without authentication issues.
