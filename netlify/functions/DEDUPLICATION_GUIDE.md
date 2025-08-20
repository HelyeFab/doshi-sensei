# Article Deduplication Guide

## Overview
This guide explains how article deduplication works in the Doshi Sensei scrapers to prevent saving duplicate articles.

## How It Works

### 1. Consistent ID Generation
Instead of using timestamp-based IDs like `todaii_${Date.now()}_${i}`, we now generate consistent IDs based on the article URL:

```javascript
// Old approach - creates new ID each time
id: `todaii_${Date.now()}_${i}`

// New approach - same URL always gets same ID
id: generateArticleId(article.url) // e.g., "article_a1b2c3d4e5f6"
```

### 2. Duplicate Detection
Before saving articles, we check if they already exist in Firestore:

```javascript
const newArticles = await filterExistingArticles(db, articles);
```

### 3. Usage in Scrapers

#### Option 1: Use the utility function directly
```javascript
const { saveArticlesWithDeduplication } = require('./article-deduplication');

async function saveArticlesToFirebase(articles) {
  const savedCount = await saveArticlesWithDeduplication(db, articles, admin);
  return savedCount > 0;
}
```

#### Option 2: Manual implementation
```javascript
const { generateArticleId, filterExistingArticles } = require('./article-deduplication');

// Generate consistent IDs
const articlesWithIds = articles.map(article => ({
  ...article,
  id: generateArticleId(article.url)
}));

// Filter duplicates
const newArticles = await filterExistingArticles(db, articlesWithIds);
```

## Benefits

1. **No Duplicate Articles**: The same article scraped on different days won't be saved multiple times
2. **Consistent IDs**: Articles always have the same ID based on their URL
3. **Efficient Storage**: Reduces database size and costs
4. **Better User Experience**: Users won't see duplicate articles in their feed

## Implementation Status

### Updated Scrapers
- ✅ `scrape-todaii-next.js`
- ✅ `scrape-nhk-easy.js`
- ✅ `scrape-news-scheduled.js`

### Pending Updates
- ⏳ `scrape-watanoc-next.js`
- ⏳ `scrape-nhk-improved.js`
- ⏳ `scrape-yahoo-news.js`
- ⏳ `scrape-mainichi-shogakusei.js`
- ⏳ Other scrapers...

## Migration Notes

- Existing articles with timestamp-based IDs will remain unchanged
- New articles will use URL-based IDs
- If an article's URL changes, it will be treated as a new article