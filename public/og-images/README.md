# Open Graph Images Directory

This directory contains section-specific Open Graph images for better social media sharing.

## Image Specifications
- **Dimensions**: 1200x630px (recommended by Facebook/Twitter)
- **Format**: PNG
- **File size**: Keep under 5MB (ideally under 1MB)

## Required Images

### Core Learning Sections
- [ ] `og-games.png` - Games section
- [ ] `og-practice.png` - Practice section  
- [ ] `og-vocabulary.png` - Vocabulary section
- [ ] `og-drill.png` - Drill section

### Content Sections
- [ ] `og-stories.png` - Stories section
- [ ] `og-resources.png` - Resources section
- [ ] `og-news.png` - News section
- [ ] `og-kanji.png` - Kanji browser/moods

### Tools
- [ ] `og-tools.png` - Tools section (YouTube shadowing, textbook vocabulary)

## Design Guidelines

### All images should include:
1. **Dōshi Sensei logo/branding**
2. **Purple color scheme** (#8a5cf6 as primary)
3. **Section title** (large, readable)
4. **Brief description** (what the section offers)
5. **Relevant graphics/icons** for the section
6. **Japanese elements** (characters, symbols appropriate to section)

### Text Guidelines:
- Main title: 48-72px
- Subtitle: 24-36px  
- Ensure high contrast for readability
- Test readability at small sizes (how it appears in social feeds)

## Usage Example

In your page.tsx files:
```typescript
export const metadata: Metadata = generatePageMetadata({
  title: 'Japanese Learning Games',
  description: 'Learn Japanese through games...',
  keywords: ['games', 'kanji'],
  path: '/games',
  image: '/og-images/og-games.png'  // Add this line
});
```

## Testing Your Images

After adding images, test them with:
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

## Placeholder Creation

To create placeholder images for testing:
```bash
# Using ImageMagick (if installed)
convert -size 1200x630 xc:purple -fill white -pointsize 72 \
  -gravity center -annotate +0+0 'Dōshi Sensei\nGames' \
  og-games.png
```

## Notes
- Default fallback image is `/doshi.png` if section image is not specified
- Images are cached by social platforms, use their debuggers to refresh
- Consider creating seasonal/themed variations for special events