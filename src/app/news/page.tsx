import type { Metadata } from 'next';
import NewsPage from './NewsPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Japanese News Reader - NHK News with Furigana',
  description: 'Read real Japanese news from NHK with automatic furigana, vocabulary lookup, and grammar explanations. Perfect for intermediate learners to improve reading comprehension with current events.',
  keywords: [
    "Japanese news",
    "NHK news",
    "Japanese reading",
    "news with furigana",
    "reading comprehension",
    "current events Japanese",
    "Japanese articles"
  ],
  path: '/news',
  image: '/og-images/og-news.png'
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "News",
      "url": "/news"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <NewsPage />
    </>
  );
}
