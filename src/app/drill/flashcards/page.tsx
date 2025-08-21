import type { Metadata } from 'next';
import FlashcardReviewPage from './FlashcardReviewPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Flashcards',
  description: 'Flashcards - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/drill/flashcards',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Flashcards",
      "url": "/flashcards"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <FlashcardReviewPage />
    </>
  );
}