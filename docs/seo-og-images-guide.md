# SEO Open Graph Images Guide

## Current Status
All pages currently use the default `/doshi.png` image for Open Graph sharing. To improve social media presence, you should create section-specific images.

## Recommended Open Graph Images

### 1. Create these images (1200x630px recommended):
- `/public/og-images/og-games.png` - For games section (colorful, show game elements)
- `/public/og-images/og-practice.png` - For practice section (show kana/kanji practice)
- `/public/og-images/og-vocabulary.png` - For vocabulary section (word cards, flashcards)
- `/public/og-images/og-stories.png` - For stories section (book/reading theme)
- `/public/og-images/og-resources.png` - For resources section (learning materials)
- `/public/og-images/og-tools.png` - For tools section (YouTube, textbook themes)
- `/public/og-images/og-kanji.png` - For kanji browser/moods (beautiful kanji)

### 2. How to implement:
Update the page.tsx files to pass custom images:

```typescript
export const metadata: Metadata = generatePageMetadata({
  title: 'Japanese Learning Games',
  description: 'Learn Japanese through games...',
  keywords: ['games', 'kanji'],
  path: '/games',
  image: '/og-images/og-games.png'  // Add this line
});
```

### 3. Image Design Guidelines:
- Include "Dōshi Sensei" branding
- Use consistent color scheme (purple theme)
- Add relevant icons/graphics for each section
- Include descriptive text about the section
- Ensure text is readable at small sizes

### 4. Testing:
Use these tools to test your Open Graph images:
- Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
- Twitter Card Validator: https://cards-dev.twitter.com/validator
- LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/

## Structured Data Review

Your app already has comprehensive structured data implementation:
- ✅ Organization schema
- ✅ Website schema  
- ✅ Educational app schema
- ✅ Course schema generator
- ✅ FAQ page schema generator
- ✅ Breadcrumb schema generator

The structured data is properly implemented across all pages using the `StructuredData` component.

## Additional SEO Recommendations

1. **Dynamic Sitemap**: Consider implementing a dynamic sitemap generator for content that changes frequently (stories, news, resources).

2. **RSS Feed**: Add RSS feeds for:
   - News articles
   - New stories
   - New resources

3. **Schema Markup for Content**:
   - Add Article schema for news/stories
   - Add LearningResource schema for educational content
   - Add VideoObject schema for YouTube shadowing content

4. **Meta Tags Enhancement**:
   - Add `og:video` for pages with video content
   - Add `article:author` for content pages
   - Add `article:published_time` for time-sensitive content