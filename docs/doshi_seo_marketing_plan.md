
# 🌐 Doshi Sensei SEO & Marketing Implementation Plan

This document outlines a strategy to maximize discoverability and conversion for your app through SEO and organic marketing channels.

---

## 🔍 SEO Implementation Plan

### ✅ 1. Meta Tags for Every Page

- Use descriptive `<title>` and `<meta description>` on all major pages.
- Example:

```html
<title>Doshi Sensei – Master Japanese Vocabulary & Kanji</title>
<meta name="description" content="Learn Japanese the fun way with drills, kanji maps, and listening games. Built for JLPT learners." />
```

### ✅ 2. Open Graph & Twitter Card Tags

Boost link previews on social media:

```html
<meta property="og:title" content="Doshi Sensei – Learn Japanese">
<meta property="og:description" content="Your AI-powered Japanese learning companion.">
<meta property="og:image" content="/social-preview.png">
<meta name="twitter:card" content="summary_large_image">
```

### ✅ 3. Sitemap.xml

Auto-generate via a Next.js plugin or manually include key routes:

```
/                 (home)
/kanji            (kanji map)
/drill            (drill interface)
/vocab            (dictionary)
/news             (read articles)
/pricing          (subscriptions)
/login            (authentication)
```

### ✅ 4. robots.txt

Basic rule to allow crawling:

```
User-agent: *
Allow: /
Sitemap: https://doshisensei.com/sitemap.xml
```

### ✅ 5. Page Speed & Mobile UX

- Use [Lighthouse](https://pagespeed.web.dev/) to audit
- Optimise image sizes
- Lazy-load game features not visible initially

### ✅ 6. Schema Markup (JSON-LD)

For example, define your app as a Product:

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Doshi Sensei",
  "applicationCategory": "EducationApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0.00",
    "priceCurrency": "USD"
  }
}
```

---

## 📣 Marketing Strategy (Organic)

### ✅ 1. Community-Based Launch

**Where to post:**

| Platform       | Type                | Example |
|----------------|---------------------|---------|
| Reddit         | r/LearnJapanese     | 🧠 Tip-style teaser post + link |
| Discord        | Language learner servers | Demo link with screenshots |
| Facebook       | JLPT & Japanese groups | Announce beta + get testers |
| Twitter/X      | Tag #100DaysOfJapanese, #JapaneseLearning | Launch thread |

### ✅ 2. Product Hunt or BetaList

- Prepare a compelling landing page + demo video
- Target: early traction & feedback from tech crowd

### ✅ 3. SEO Content Plan

Create a `/blog` section with keyword-based articles:

- “Best ways to learn kanji for JLPT N5”
- “How to use furigana as a beginner”
- “Free JLPT drills for N4 and N3”

Tools: SurferSEO, Ahrefs (optional), Google Trends

### ✅ 4. Email Capture

- Use free plans (e.g. Mailchimp) to collect emails from early users.
- Offer bonus drills or printable kana charts as a reward.

---

## 📊 Metrics to Track

| KPI                     | Tool           |
|-------------------------|----------------|
| Visitor count           | Plausible, Fathom or Google Analytics |
| Conversion rate (Free → Premium) | Firebase Custom Events |
| SEO performance         | Google Search Console |
| Engagement (time on site) | Netlify Analytics or Vercel |
| Retention (7-day)       | Firebase or Mixpanel |

---

## 🔐 Post-Launch

- Monitor user feedback channels
- Patch bugs + iterate homepage copy
- Create a Discord or in-app community for engagement

---

## ✅ Ready for Launch 🚀

Let me know if you want help writing:
- Blog posts
- Social media copy
- Teaser videos or demo landing page
