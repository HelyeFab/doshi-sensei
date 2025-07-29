import type { Metadata } from 'next';
import TextbookVocabularyPage from './TextbookVocabularyPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Textbook Vocabulary - Complete Genki & Minna no Nihongo',
  description: 'Study complete vocabulary sets from Genki I & II (1,700+ words) and Minna no Nihongo I & II (2,800+ words). Practice with interactive flashcards, spaced repetition, and track your progress through all chapters.',
  keywords: [
    "Genki vocabulary",
    "Genki 1 vocabulary",
    "Genki 2 vocabulary",
    "Minna no Nihongo vocabulary",
    "Minna no Nihongo 1",
    "Minna no Nihongo 2",
    "Japanese textbook vocabulary",
    "textbook flashcards",
    "spaced repetition",
    "chapter vocabulary"
  ],
  path: '/tools/textbook-vocabulary',
  image: '/og-images/og-tools.png'
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Tools",
      "url": "/tools"
    },
    {
      "name": "Textbook Vocabulary",
      "url": "/tools/textbook-vocabulary"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <TextbookVocabularyPage />
    </>
  );
}
