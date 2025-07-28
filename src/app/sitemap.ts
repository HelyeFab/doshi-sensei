import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://doshisensei.com';
  
  // Static routes
  const staticRoutes = [
  {
    url: `${baseUrl}/`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 1
  },
  {
    url: `${baseUrl}/account`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/achievements`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/achievements-test`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/admin`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/admin/achievements`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/admin/achievements/analytics`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/admin/activities`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/admin/analytics`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/admin/analytics/behavior`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/admin/analytics/content`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/admin/analytics/conversions`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/admin/analytics/features`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/admin/articles`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/admin/debug`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/admin/features`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/admin/kpi-dashboard`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/admin/logs`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/admin/mood-boards`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/admin/mood-boards/new`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/admin/resources`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/admin/resources/new`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/admin/snake-path`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/admin/stories`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/admin/stories/generate`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/admin/stories/new`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/admin/user-entitlements`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/admin/users`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/auth/action`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/contact`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/diagnose-articles`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/drill`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/drill/conjugation`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/drill/flashcards`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/favourites`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/games`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/games/kanji-simon`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/games/reading-routes`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/games/stroke-order-practice`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/kanji-browser`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/kanji-moods`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/login`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/news`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/offline`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/popular-videos`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/practice`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/practice/conjugation`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/practice/hiragana`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/practice/kana`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/practice/katakana`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/practice/snake-adjust`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/practice/snake-demo`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/pwa-test`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/read`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/reset-password`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/resources`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/settings`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/settings/acknowledgments`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/settings/privacy-policy`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/settings/terms-of-service`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/stories`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/test-ai-explanation`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/test-audio`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/test-cache`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/test-eviction`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/test-kana-audio`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/test-minimal-ai`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/test-shadowing`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/test-simple-ai`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/test-three-pillar-integration`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/tools/my-videos`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/tools/textbook-vocabulary`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/tools/youtube-shadowing`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/verify-email`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    url: `${baseUrl}/vocabulary`,
    lastModified: "2025-07-28T21:17:20.891Z",
    changeFrequency: "weekly",
    priority: 0.8
  }
];

  // Add dynamic routes here
  // Example:
  // const posts = await getPosts();
  // const dynamicRoutes = posts.map((post) => ({
  //   url: `${baseUrl}/blog/${post.slug}`,
  //   lastModified: post.updatedAt,
  //   changeFrequency: 'monthly',
  //   priority: 0.7,
  // }));

  return [
    ...staticRoutes,
    // ...dynamicRoutes,
  ];
}