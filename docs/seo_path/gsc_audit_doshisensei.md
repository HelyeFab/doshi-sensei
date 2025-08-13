# Google Search Console Audit – doshisensei.com
_Date: Aug 13, 2025_

---

## 1. Indexing → Pages

### 1.1 Page with redirect (8 pages)
- **Findings:** Mostly protocol/domain redirects (http→https, www→non-www) and private/auth pages (`/settings`, `/offline`).
- **Action:**  
  - Keep redirects — good for canonical consistency.
  - Remove private pages from sitemap.

---

### 1.2 Blocked by robots.txt (5 pages)
- **Findings:** `/api/`, `/account`, `_next/static` font files.
- **Action:** No change needed — all intentionally blocked non-content assets.

---

### 1.3 Not found (404) (3 pages)
- **URLs:**  
  - `/katakana`
  - `/kana`
  - `/reading-routes`
- **Action:**  
  - If content should exist → recreate page.  
  - If removed permanently → 301 redirect to closest relevant page via `_redirects` in Netlify.

---

### 1.4 Duplicate without user-selected canonical (2 pages)
- **URLs:** `/favourites/`, `/offline.html`
- **Action:**  
  - `/favourites/`: If public → set canonical to main version. If private → noindex or leave as is.  
  - `/offline.html`: Leave unindexed.

---

### 1.5 Crawled – currently not indexed (3 pages)
- **Findings:** `browserconfig.xml`, `manifest.json`, `favicon.ico`
- **Action:** None — non-HTML technical files.

---

### 1.6 Server error (5xx)
- **Findings:** None.

---

## 2. Indexing → Sitemaps
- **Findings:** `/sitemap.xml` (Success, last read Jul 29, 2025, 33 discovered pages).
- **Action:**  
  - Ensure only indexable pages are listed.
  - Add sitemap line to `robots.txt`:
    ```
    Sitemap: https://doshisensei.com/sitemap.xml
    ```

---

## 3. Indexing → Removals
- **Findings:** No removals in last 6 months.
- **Action:** None.

---

## 4. Experience → Core Web Vitals
- **Findings:** No data (insufficient traffic).
- **Action:**  
  - Run **PageSpeed Insights** for key pages.
  - Optimize for LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 before traffic grows.

---

## 5. Experience → HTTPS
- **Findings:** 0 non-HTTPS URLs.
- **Action:** None.

---

## 6. Security & Manual Actions
- **Findings:** No manual actions or security issues.
- **Action:** None.

---

## 7. Links
- **Findings:** No internal/external link data yet.
- **Action:**  
  - Build backlinks (guest posts, directory listings, outreach).
  - Strengthen internal linking — homepage → category → detail pages.

---

## 8. Settings
- **Ownership:** Verified.  
- **Associations:** None.
- **robots.txt:** All valid.
- **Crawl stats:**  
  - 263 requests in 90 days.
  - Avg. response time: 1.76s.
  - Past problems for `doshisensei.com` — monitor 5xx spikes.
  - 33% of crawls are redirects (normal for canonicalization).
  - 9% are 404 — matches broken pages above.

---

## 9. Priority Action List

### High Priority (next 7 days)
- [ ] Decide for each 404 whether to **recreate** or **301 redirect**.
- [ ] Ensure sitemap excludes private or redirecting pages.
- [ ] Add sitemap to `robots.txt`.

### Medium Priority (next 14–30 days)
- [ ] Review `/favourites/` canonical tag.
- [ ] Improve internal linking for discoverability.
- [ ] Test homepage and top pages in PageSpeed Insights.

### Long Term
- [ ] Build quality backlinks to gain external link equity.
- [ ] Monitor crawl stats for spikes in 5xx or 404.
- [ ] Once traffic grows, monitor Core Web Vitals in GSC.

---

## 10. Notes
- No critical security, HTTPS, or indexing issues.
- Most non-indexed pages are either intentional or minor.
- Main growth opportunities: fix 404s, strengthen internal linking, and build backlinks.
