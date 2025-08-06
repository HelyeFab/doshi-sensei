import { MetadataRoute } from 'next';

// The sitemap queries will fail during build time because Firebase needs authentication
// We'll return static routes only and let dynamic content be discovered naturally
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://doshisensei.com';
  
  // Static routes only - no dynamic queries to avoid permission errors
  const staticRoutes = [
    // Main pages
    { url: `${baseUrl}/`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 1.0 },
    { url: `${baseUrl}/practice`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.9 },
    { url: `${baseUrl}/drill`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.9 },
    { url: `${baseUrl}/games`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.8 },
    { url: `${baseUrl}/vocabulary`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.9 },
    { url: `${baseUrl}/stories`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.8 },
    { url: `${baseUrl}/resources`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${baseUrl}/news`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.8 },
    { url: `${baseUrl}/kanji-browser`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.8 },
    { url: `${baseUrl}/kanji-moods`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.8 },
    { url: `${baseUrl}/popular-videos`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.7 },
    
    // Tools
    { url: `${baseUrl}/tools/youtube-shadowing`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.8 },
    { url: `${baseUrl}/tools/textbook-vocabulary`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.8 },
    { url: `${baseUrl}/tools/word-learning-session`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${baseUrl}/tools/kanji-mastery`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${baseUrl}/tools/kanji-mastery/browse`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.6 },
    { url: `${baseUrl}/tools/kanji-mastery/learn`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.6 },
    { url: `${baseUrl}/tools/kanji-mastery/review`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.6 },
    
    // Practice pages
    { url: `${baseUrl}/practice/hiragana`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${baseUrl}/practice/katakana`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${baseUrl}/practice/kana`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${baseUrl}/practice/conjugation`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.8 },
    
    // Drill pages
    { url: `${baseUrl}/drill/conjugation`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.8 },
    { url: `${baseUrl}/drill/flashcards`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.8 },
    
    // Game pages
    { url: `${baseUrl}/games/kanji-simon`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${baseUrl}/games/reading-routes`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${baseUrl}/games/stroke-order-practice`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.7 },
    
    // User pages
    { url: `${baseUrl}/account`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.4 },
    { url: `${baseUrl}/favourites`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.6 },
    { url: `${baseUrl}/achievements`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.5 },
    { url: `${baseUrl}/leaderboard`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.6 },
    { url: `${baseUrl}/friends`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.5 },
    
    // Legal and info pages
    { url: `${baseUrl}/settings`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.3 },
    { url: `${baseUrl}/settings/privacy-policy`, lastModified: new Date(), changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${baseUrl}/settings/terms-of-service`, lastModified: new Date(), changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${baseUrl}/settings/acknowledgments`, lastModified: new Date(), changeFrequency: "yearly" as const, priority: 0.2 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.5 },
    
    // Auth pages (important for SEO)
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${baseUrl}/reset-password`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.3 },
  ];

  return staticRoutes;
}

// Note: Dynamic content (stories, news articles, mood boards, resources) will be discovered
// through internal linking and Google's natural crawling process. This avoids the
// Firestore permission errors during build time while still maintaining good SEO.