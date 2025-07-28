# SEO Implementation Plan - Doshi Sensei

## Branch: feature/seo-implementation

## Overview
This document outlines our plan for implementing SEO in the Doshi Sensei Next.js application using the proper Server/Client component architecture.

## Implementation Phases

### Phase 1: Core Layout SEO (Starting Point)
- [ ] Update root layout.tsx with comprehensive default metadata
- [ ] Ensure metadata is properly typed and complete
- [ ] Add structured data for the application

### Phase 2: High-Priority Pages
Pages to implement first (high traffic/important for SEO):

1. **Home Page (/)** 
   - Currently: Client Component with 'use client'
   - Action: Keep as-is (already working)

2. **Vocabulary (/vocabulary)**
   - Currently: Client Component
   - Action: Create wrapper Server Component

3. **Stories (/stories)**
   - Currently: Client Component  
   - Action: Create wrapper Server Component

4. **Kanji Browser (/kanji-browser)**
   - Currently: Client Component
   - Action: Create wrapper Server Component

5. **Games (/games)**
   - Currently: Client Component
   - Action: Create wrapper Server Component

### Phase 3: Secondary Pages
- [ ] Practice pages (/practice/*)
- [ ] Drill pages (/drill/*)
- [ ] News page (/news)
- [ ] Resources page (/resources)
- [ ] Account/Settings pages

### Phase 4: SEO Infrastructure
- [ ] Create sitemap.ts in app directory
- [ ] Create robots.ts in app directory
- [ ] Add manifest.json for PWA
- [ ] Implement structured data helpers

### Phase 5: Dynamic SEO
- [ ] Add dynamic metadata for story pages
- [ ] Add dynamic metadata for news articles
- [ ] Add dynamic metadata for resource pages

## Implementation Strategy

### For Each Page Migration:

1. **Check Current State**
   ```bash
   # Check if page has 'use client'
   grep "use client" src/app/[page]/page.tsx
   ```

2. **Create Component Structure**
   ```
   src/app/[feature]/
   ├── page.tsx              # Server Component (NEW)
   └── [Feature]Page.tsx     # Client Component (existing code)
   ```

3. **Move Existing Code**
   - Rename current page.tsx to [Feature]Page.tsx
   - Create new page.tsx as Server Component

4. **Test Immediately**
   - Run dev server
   - Navigate to the page
   - Verify functionality

5. **Commit**
   ```bash
   git add .
   git commit -m "feat(seo): Add SEO to /[feature] page"
   ```

## Testing Checklist

For each implemented page:
- [ ] Page loads without errors
- [ ] All interactive features work
- [ ] Metadata appears in page source
- [ ] No console errors
- [ ] Build succeeds

## Rollback Plan

If any implementation breaks functionality:
```bash
# Revert last commit
git reset --hard HEAD~1

# Or revert to main branch
git checkout main
```

## Success Metrics

- All pages have proper metadata
- SEO audit score improves to 80+
- No functionality is broken
- Build and tests pass
- Lighthouse SEO score is green

## Notes

- We will NOT use the MCP tool's automatic mode
- All changes will be manual and tested
- Each page will be committed separately for easy rollback
- We prioritize working functionality over perfect SEO