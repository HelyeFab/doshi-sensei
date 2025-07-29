import type { Metadata } from 'next';
import KanjiMoodsPage from './KanjiMoodsPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Kanji Mood Boards - Learn Kanji by Theme',
  description: 'Study kanji grouped by themes and moods: nature, emotions, seasons, daily life, and more. Visual learning with beautiful mood boards that help you remember kanji through contextual associations.',
  keywords: [
    "kanji mood boards",
    "themed kanji",
    "kanji by theme",
    "visual kanji learning",
    "kanji groups",
    "contextual kanji",
    "kanji categories"
  ],
  path: '/kanji-moods',
  image: '/og-images/og-kanji.png'
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Kanji Moods",
      "url": "/kanji-moods"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <KanjiMoodsPage />
    </>
  );
}
