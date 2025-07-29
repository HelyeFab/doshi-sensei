import type { Metadata } from 'next';
import VocabularyPage from './VocabularyPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Japanese Vocabulary Builder',
  description: 'Build your Japanese vocabulary with our comprehensive database. Search kanji, words, and phrases with meanings, readings, and example sentences.',
  keywords: [
    'Japanese vocabulary',
    'Japanese words',
    'kanji dictionary',
    'Japanese phrases',
    'JLPT vocabulary',
    'Japanese dictionary',
  ],
  path: '/vocabulary',
  image: '/og-images/og-vocabulary.png'
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    { name: 'Home', url: '/' },
    { name: 'Vocabulary', url: '/vocabulary' },
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <VocabularyPage />
    </>
  );
}
