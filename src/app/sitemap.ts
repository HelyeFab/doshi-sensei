import { MetadataRoute } from 'next';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

// Function to get dynamic stories
async function getDynamicStories(): Promise<{ url: string; lastModified: Date; changeFrequency: any; priority: number }[]> {
  try {
    const storiesRef = collection(db, 'stories');
    const q = query(
      storiesRef,
      where('published', '==', true),
      orderBy('publishedAt', 'desc'),
      limit(100) // Limit to 100 most recent stories
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        url: `/stories/${data.slug || doc.id}`,
        lastModified: data.publishedAt?.toDate() || new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.6
      };
    });
  } catch (error) {
    console.error('Error fetching stories for sitemap:', error);
    return [];
  }
}

// Function to get dynamic news articles
async function getDynamicNews(): Promise<{ url: string; lastModified: Date; changeFrequency: any; priority: number }[]> {
  try {
    const newsRef = collection(db, 'news');
    const q = query(
      newsRef,
      orderBy('date', 'desc'),
      limit(100) // Limit to 100 most recent articles
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        url: `/news/${doc.id}`,
        lastModified: data.date?.toDate() || new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.6
      };
    });
  } catch (error) {
    console.error('Error fetching news for sitemap:', error);
    return [];
  }
}

// Function to get dynamic resources
async function getDynamicResources(): Promise<{ url: string; lastModified: Date; changeFrequency: any; priority: number }[]> {
  try {
    const resourcesRef = collection(db, 'resources');
    const q = query(
      resourcesRef,
      where('published', '==', true),
      orderBy('publishedAt', 'desc'),
      limit(50) // Limit to 50 most recent resources
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        url: `/resources/${data.slug || doc.id}`,
        lastModified: data.publishedAt?.toDate() || new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.5
      };
    });
  } catch (error) {
    console.error('Error fetching resources for sitemap:', error);
    return [];
  }
}

// Function to get dynamic mood boards
async function getDynamicMoodBoards(): Promise<{ url: string; lastModified: Date; changeFrequency: any; priority: number }[]> {
  try {
    const moodBoardsRef = collection(db, 'moodBoards');
    const q = query(
      moodBoardsRef,
      where('isPublic', '==', true),
      orderBy('createdAt', 'desc'),
      limit(50) // Limit to 50 most recent public mood boards
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      url: `/kanji-moods/${doc.id}`,
      lastModified: doc.data().createdAt?.toDate() || new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5
    }));
  } catch (error) {
    console.error('Error fetching mood boards for sitemap:', error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://doshisensei.com';
  
  // Static routes - excluding admin and test pages
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
    
    // Legal and info pages
    { url: `${baseUrl}/settings`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.3 },
    { url: `${baseUrl}/settings/privacy-policy`, lastModified: new Date(), changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${baseUrl}/settings/terms-of-service`, lastModified: new Date(), changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${baseUrl}/settings/acknowledgments`, lastModified: new Date(), changeFrequency: "yearly" as const, priority: 0.2 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.5 },
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

  // Get all dynamic content
  const [stories, news, resources, moodBoards] = await Promise.all([
    getDynamicStories(),
    getDynamicNews(),
    getDynamicResources(),
    getDynamicMoodBoards()
  ]);

  // Convert dynamic routes to sitemap format
  const dynamicRoutes = [
    ...stories.map(item => ({
      url: `${baseUrl}${item.url}`,
      lastModified: item.lastModified,
      changeFrequency: item.changeFrequency,
      priority: item.priority,
    })),
    ...news.map(item => ({
      url: `${baseUrl}${item.url}`,
      lastModified: item.lastModified,
      changeFrequency: item.changeFrequency,
      priority: item.priority,
    })),
    ...resources.map(item => ({
      url: `${baseUrl}${item.url}`,
      lastModified: item.lastModified,
      changeFrequency: item.changeFrequency,
      priority: item.priority,
    })),
    ...moodBoards.map(item => ({
      url: `${baseUrl}${item.url}`,
      lastModified: item.lastModified,
      changeFrequency: item.changeFrequency,
      priority: item.priority,
    })),
  ];

  return [
    ...staticRoutes,
    ...dynamicRoutes,
  ];
}