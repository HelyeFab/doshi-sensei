import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://doshisensei.com';
  
  // Define all static routes
  const staticRoutes = [
    '',
    '/vocabulary',
    '/stories',
    '/kanji-browser',
    '/games',
    '/practice',
    '/practice/conjugation',
    '/practice/hiragana',
    '/practice/katakana',
    '/practice/kana',
    '/drill',
    '/drill/conjugation',
    '/drill/flashcards',
    '/news',
    '/resources',
    '/kanji-moods',
    '/games/kanji-simon',
    '/games/reading-routes',
    '/games/stroke-order-practice',
    '/tools/youtube-shadowing',
    '/tools/textbook-vocabulary',
    '/popular-videos',
    '/achievements',
    '/account',
    '/settings',
    '/settings/privacy-policy',
    '/settings/terms-of-service',
    '/settings/acknowledgments',
    '/login',
    '/contact',
  ];

  // Generate sitemap entries for static routes
  const staticEntries = staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // You could add dynamic routes here if needed
  // For example, fetch all story slugs and news article IDs
  
  return staticEntries;
}