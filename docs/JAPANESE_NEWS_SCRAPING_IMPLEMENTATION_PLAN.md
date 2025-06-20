# 📰 Japanese News Scraping Implementation Plan

**Project**: Doshi Sensei - Japanese News Reading Feature
**Date**: June 2025
**Status**: Planning Phase

---

## 🎯 Project Overview

### Objective
Implement a Japanese news scraping system using Puppeteer to provide authentic reading practice materials for Doshi Sensei users. This will transform the placeholder "Reading" feature into a comprehensive news-based learning tool.

### Value Proposition
- **Authentic Content**: Real Japanese news for immersive learning
- **Vocabulary Integration**: Extract and integrate with existing word systems
- **Progressive Difficulty**: From NHK Easy to advanced news sources
- **Comprehensive Learning**: Reading + vocabulary + kanji study in one flow

---

## 📊 Technical Analysis

### Current Doshi Sensei Architecture
- **Frontend**: Next.js 15 with App Router, TypeScript
- **Storage**: Dual system (IndexedDB + localStorage)
- **Deployment**: Netlify with Functions
- **Existing Systems**: Vocabulary browser, kanji system, study lists, conjugation practice

### Integration Points
1. **Vocabulary System**: `src/utils/api.ts` - existing word search and management
2. **Kanji System**: `src/utils/kanjiManager.ts` - kanji detection and highlighting
3. **Study Lists**: `src/utils/studyListManager.ts` - save vocabulary from articles
4. **Storage**: `src/utils/storage.ts` - cache articles and reading progress
5. **Statistics**: `src/utils/stats.ts` - track reading comprehension and time

---

## 🎯 Target News Sources

### Phase 1: Beginner-Friendly (Primary Focus)
1. **NHK News Web Easy** (https://www3.nhk.or.jp/news/easy/)
   - ✅ Simplified Japanese for learners
   - ✅ Furigana included
   - ✅ Clean HTML structure
   - ✅ Categorized content
   - ⚠️ Rate limiting required

2. **Yahoo News Japan - Simple Articles**
   - ✅ Good variety of topics
   - ✅ Clean structure
   - ✅ Mobile-friendly

### Phase 2: Intermediate Sources
1. **Asahi Shimbun Digital**
2. **Mainichi Shimbun**

### Phase 3: Advanced Sources
1. **Yomiuri Shimbun Online**
2. **Nikkei (Economic focus)**

---

## 🏗️ Implementation Phases

### 📋 Phase 1: Foundation & NHK Easy Scraper (Week 1-2)
**Duration**: 8-12 days
**Priority**: High

#### Deliverables
1. **Core Scraping Infrastructure**
   - Puppeteer setup in Netlify Functions
   - Error handling and retry logic
   - Rate limiting implementation
   - Basic article parsing

2. **NHK Easy News Scraper**
   - Article list scraping
   - Individual article content extraction
   - Metadata extraction (title, date, category)
   - Image URL capture

3. **Data Models & Storage**
   - NewsArticle TypeScript interfaces
   - Storage integration with existing IndexedDB system
   - Article caching mechanism

4. **Basic API Endpoints**
   - `/api/news/nhk-easy` - Fetch latest articles
   - `/api/news/article/[id]` - Get specific article
   - Error handling and validation

#### Technical Tasks
- [x] Set up Puppeteer in Netlify Functions
- [x] Create `src/types/news.ts` with article interfaces
- [x] Implement `src/utils/newsScraper.ts`
- [x] Create `netlify/functions/scrape-nhk-news.js`
- [x] Add article storage to IndexedDB schema
- [x] Implement caching strategy
- [x] Add rate limiting logic
- [x] Error handling and logging

---

### 📖 Phase 2: Reading Interface & Vocabulary Integration (Week 3-4)
**Duration**: 10-14 days
**Priority**: High

#### Deliverables
1. **Reading Page UI**
   - Article list view with categories
   - Individual article reader
   - Mobile-responsive design
   - Loading states and error handling

2. **Vocabulary Integration**
   - Highlight known vocabulary in articles
   - Click-to-define functionality
   - Integration with existing JapaneseWord system
   - Difficulty level estimation

3. **User Experience Features**
   - Article bookmarking
   - Reading progress tracking
   - Font size adjustment
   - Furigana toggle

#### Technical Tasks
- [x] Create `src/app/reading/page.tsx`
- [x] Implement article list component
- [x] Create article reader component
- [x] Integrate vocabulary highlighting
- [x] Add bookmark functionality
- [x] Implement reading progress tracking
- [x] Create responsive mobile design

---

### 🎓 Phase 3: Learning Features & Study Integration (Week 5-6)
**Duration**: 8-12 days
**Priority**: Medium

#### Deliverables
1. **Study List Integration**
   - Save vocabulary from articles to study lists
   - Create article-based vocabulary lists
   - Integration with flashcard system

2. **Comprehension Features**
   - Reading time tracking
   - Vocabulary coverage analysis
   - Difficulty assessment
   - Reading statistics

3. **Learning Tools**
   - Furigana overlay system
   - Vocabulary popup definitions
   - Kanji information integration
   - Audio pronunciation (if available)

#### Technical Tasks
- [ ] Integrate with `StudyListManager`
- [ ] Add vocabulary extraction from articles
- [ ] Implement reading analytics
- [ ] Create furigana overlay system
- [ ] Add kanji information popups
- [ ] Integrate with existing TTS system

---

### 🚀 Phase 4: Advanced Features & Multiple Sources (Week 7-8)
**Duration**: 10-14 days
**Priority**: Medium

#### Deliverables
1. **Multiple News Sources**
   - Yahoo News Japan scraper
   - Source selection interface
   - Unified article format

2. **Advanced Reading Features**
   - Article search and filtering
   - Category-based browsing
   - Reading history
   - Personalized recommendations

3. **Offline Support**
   - Article caching for offline reading
   - PWA integration
   - Sync with existing offline systems

#### Technical Tasks
- [ ] Implement Yahoo News scraper
- [ ] Create unified article interface
- [ ] Add search and filtering
- [ ] Implement reading history
- [ ] Add offline caching
- [ ] Create recommendation algorithm

---

### 🎨 Phase 5: Polish & Optimization (Week 9-10)
**Duration**: 6-10 days
**Priority**: Low

#### Deliverables
1. **Performance Optimization**
   - Image lazy loading
   - Article preloading
   - Caching optimization
   - Bundle size optimization

2. **UI/UX Polish**
   - Theme integration
   - Animation improvements
   - Accessibility enhancements
   - User testing feedback

3. **Monitoring & Analytics**
   - Scraping success rates
   - User engagement metrics
   - Error monitoring
   - Performance tracking

---

## 📋 Data Models

### Core Interfaces

```typescript
interface NewsArticle {
  id: string;
  title: string;
  content: string;
  summary?: string;
  url: string;
  imageUrl?: string;
  publishDate: Date;
  scrapedAt: Date;
  source: NewsSource;
  category: string;
  tags: string[];
  difficulty: JLPTLevel;
  estimatedReadingTime: number;
  vocabulary: ExtractedVocabulary[];
  kanji: ExtractedKanji[];
}

interface NewsSource {
  id: string;
  name: string;
  baseUrl: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  hasRuby: boolean;
}

interface ExtractedVocabulary {
  word: string;
  reading: string;
  position: number;
  isKnown: boolean;
  definition?: string;
}

interface ReadingProgress {
  articleId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  scrollProgress: number;
  vocabularyEncountered: string[];
  timeSpent: number;
  completed: boolean;
}
```

---

## 🔧 Technical Implementation Details

### Scraping Architecture

```typescript
// Core scraper class
export class JapaneseNewsScraper {
  private static browser: Browser | null = null;

  static async initBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    return this.browser;
  }

  static async scrapeNHKEasy(): Promise<NewsArticle[]> {
    // Implementation details
  }

  static async scrapeArticle(url: string): Promise<NewsArticle> {
    // Individual article scraping
  }
}
```

### Rate Limiting Strategy
- **NHK Easy**: 1 request per 30 seconds
- **Yahoo News**: 1 request per 60 seconds
- **Advanced Sources**: 1 request per 2 minutes
- **Exponential Backoff**: On rate limit hits
- **Caching**: 6-24 hours depending on content type

### Error Handling Strategy
1. **Network Errors**: Retry with exponential backoff
2. **Parsing Errors**: Log and skip, continue with other articles
3. **Rate Limiting**: Respect limits, queue requests
4. **Source Changes**: Graceful degradation, admin notifications

---

## 🚀 Deployment Strategy

### Netlify Functions Integration
```javascript
// netlify/functions/scrape-news.js
const puppeteer = require('puppeteer-core');
const chromium = require('chrome-aws-lambda');

exports.handler = async (event, context) => {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
  });

  // Scraping logic
};
```

### Caching Strategy
- **Article Cache**: 24 hours
- **Article List**: 6 hours
- **Images**: 7 days
- **User Reading Progress**: Real-time sync

### Monitoring
- **Scraping Success Rate**: CloudWatch metrics
- **Response Times**: Performance monitoring
- **Error Rates**: Error tracking and alerting
- **User Engagement**: Reading completion rates

---

## 🎯 Success Metrics

### Phase 1 Success Criteria
- [ ] Successfully scrape 10+ NHK Easy articles
- [ ] Parse articles with 95% accuracy
- [ ] Handle rate limiting gracefully
- [ ] Store articles in IndexedDB
- [ ] Error rates < 5%

### Overall Project Success
- [ ] 100+ articles scraped successfully
- [ ] Reading feature usage > 20% of active users
- [ ] Vocabulary integration working seamlessly
- [ ] Page load times < 3 seconds
- [ ] User satisfaction score > 4.0/5.0

---

## 🔒 Legal & Ethical Considerations

### Compliance Requirements
1. **Robots.txt Compliance**: Check and follow robots.txt files
2. **Rate Limiting**: Respectful request patterns
3. **Attribution**: Proper source attribution in UI
4. **Fair Use**: Educational/non-commercial use
5. **Terms of Service**: Review and comply with each source

### Data Handling
- **No Personal Data**: Only public news content
- **Temporary Storage**: Cache articles, not user data
- **Attribution**: Clear source attribution
- **Opt-out**: Ability to remove cached content

---

## 📅 Timeline Summary

| Phase | Duration | Key Deliverable | Status |
|-------|----------|----------------|--------|
| **Phase 1** | 8-12 days | NHK Easy Scraper + Infrastructure | ✅ **Completed** |
| **Phase 2** | 10-14 days | Reading Interface + Vocabulary Integration | ✅ **Completed** |
| **Phase 3** | 8-12 days | Learning Features + Study Integration | ⏳ Pending |
| **Phase 4** | 10-14 days | Multiple Sources + Advanced Features | ⏳ Pending |
| **Phase 5** | 6-10 days | Polish + Optimization | ⏳ Pending |
| **Total** | **42-62 days** | **Complete News Reading System** | 🎯 **Planning** |

---

## 🚀 Next Steps

### Immediate Actions (Phase 1 Start)
1. ✅ **Create Implementation Plan** (This Document)
2. 🔄 **Set up Puppeteer Infrastructure** (Next Task)
3. ⏳ **Implement NHK Easy Scraper**
4. ⏳ **Create Data Models**
5. ⏳ **Build API Endpoints**

### Phase 1 Acceptance Criteria
- [ ] Puppeteer successfully scrapes NHK Easy news
- [ ] Articles stored in IndexedDB with proper caching
- [ ] API endpoints functional and tested
- [ ] Error handling and rate limiting implemented
- [ ] Basic integration with existing Doshi Sensei systems

---

*Last Updated: June 2025 | Next Review: Phase 1 Completion*
