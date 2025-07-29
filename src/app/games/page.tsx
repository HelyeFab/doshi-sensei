import type { Metadata } from 'next';
import GamesPage from './GamesPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Japanese Learning Games - Kanji, Vocabulary & More',
  description: 'Learn Japanese through engaging games: Kanji Simon Says, Reading Routes, stroke order practice, vocabulary matching, and more. Features content from Genki, Minna no Nihongo, and JLPT levels.',
  keywords: [
    "Japanese games",
    "kanji games",
    "vocabulary games",
    "learning games",
    "Kanji Simon",
    "Reading Routes",
    "stroke order game",
    "educational games"
  ],
  path: '/games',
  image: '/og-images/og-games.png'
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Games",
      "url": "/games"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <GamesPage />
    </>
  );
}
