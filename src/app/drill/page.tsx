import type { Metadata } from 'next';
import DrillPage from './DrillPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Japanese Drills - Conjugation & Vocabulary Practice',
  description: 'Master Japanese with focused drill exercises: verb conjugations, adjective forms, vocabulary from Genki and Minna no Nihongo, and kanji recognition. Features spaced repetition and progress tracking.',
  keywords: [
    "Japanese drills",
    "conjugation drills",
    "vocabulary drills",
    "spaced repetition",
    "Genki drills",
    "Minna drills",
    "practice exercises"
  ],
  path: '/drill',
  image: '/og-images/og-drill.png'
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Drills",
      "url": "/drill"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <DrillPage />
    </>
  );
}