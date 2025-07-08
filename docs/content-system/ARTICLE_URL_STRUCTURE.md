# Article URL Structure

## Overview

The article system now supports both individual article pages and the traditional list view, similar to how stories work in the application. The system aggregates articles from **multiple Japanese news sources** to provide a comprehensive learning experience.

## URL Structure

### Main News Page
- **URL**: `/news`
- **Purpose**: Lists all available articles with filtering and pagination
- **Features**:
  - Filter by JLPT level (N5-N1)
  - Filter by category (Culture, Business, Technology, etc.)
  - Filter by news source (Watanoc, Todaii, NHK Easy)
  - Pagination (20 articles per page)
  - Search functionality
  - Refresh articles from all sources
  - Multi-source article aggregation

### Individual Article Pages
- **URL**: `/news/[id]`
- **Purpose**: Display a single article with full reading experience
- **Features**:
  - Full article content with furigana support
  - Vocabulary lookup and study list integration
  - Audio playback
  - Reading progress tracking
  - Comprehension quiz
  - Bookmarking functionality
  - Reading settings (font size, highlighting, etc.)

## Implementation Details

### Data Flow

1. **Multi-Source Scraping**: Articles are scraped from three sources:
   - **Watanoc** (🌐): Real Japanese news with JLPT level estimation
   - **Todaii** (📚): Japanese learning content with vocabulary focus
   - **NHK Easy** (📺): Simplified Japanese news for learners
2. **Article Storage**: Articles are stored in Firebase Firestore
3. **Caching**: Articles are cached for 5 minutes to improve performance
4. **Individual Article Fetch**: `getArticleById()` function retrieves single articles
5. **Entitlements**: Usage tracking for free/guest users
6. **Navigation**: Seamless navigation between list and individual views

### Key Components

- **`/news/page.tsx`**: Main article listing page with multi-source filtering
- **`/news/[id]/page.tsx`**: Individual article page
- **`ArticleReader`**: Full reading experience component
- **`getArticleById()`**: Utility function for fetching individual articles
- **`newsScraper.ts`**: Multi-source scraping orchestration
- **`newsSources.ts`**: Source configuration and management
- **`watanocArticles.ts`**: Article fetching and caching utilities

### Benefits

1. **Multi-Source Content**: Articles from three different Japanese news sources
2. **SEO Friendly**: Individual articles have their own URLs
3. **Direct Linking**: Articles can be shared with direct links
4. **Browser Navigation**: Back/forward buttons work properly
5. **Bookmarking**: Browser bookmarks work for individual articles
6. **Analytics**: Better tracking of individual article views
7. **Consistency**: Matches the story system structure
8. **Diverse Content**: Different difficulty levels and content types from various sources

### Backward Compatibility

- All existing functionality remains intact
- Article cards still work as before
- Favourites page links now work correctly
- No breaking changes to existing features

## Usage Examples

### From Main News Page
```typescript
// Clicking an article card navigates to individual page
const handleArticleClick = (article: NewsArticle) => {
  window.location.href = `/news/${article.id}`;
};
```

### Direct Navigation
```typescript
// Navigate directly to an article
router.push(`/news/${articleId}`);
```

### From Favourites
```typescript
// Favourites page links now work correctly
<a href={`/news/${article.contentId}`}>
  📖 Read Article
</a>
```

## News Sources

The system aggregates articles from three carefully selected Japanese news sources:

### 🌐 Watanoc
- **Type**: Real Japanese news
- **Difficulty**: Mixed (N5-N1)
- **Features**: JLPT level estimation, real-world content
- **Target**: Intermediate to advanced learners

### 📚 Todaii
- **Type**: Japanese learning platform content
- **Difficulty**: Beginner to intermediate
- **Features**: Vocabulary-focused, educational content
- **Target**: Beginner to intermediate learners

### 📺 NHK Easy
- **Type**: Simplified Japanese news
- **Difficulty**: Beginner (N5-N4)
- **Features**: Furigana support, simplified language
- **Target**: Beginner learners

## Error Handling

- Invalid article IDs redirect to `/news`
- Missing articles show appropriate error messages
- Network errors are handled gracefully
- Loading states provide good UX
- Source-specific error handling for scraping failures

## Future Enhancements

- Article sharing functionality
- Social media integration
- Related articles suggestions
- Article comments/discussion
- Reading lists and collections
