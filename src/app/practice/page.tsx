import type { Metadata } from 'next';
import PracticePage from './PracticePage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Japanese Practice - Conjugations, Kana & Drills',
  description: 'Master Japanese through interactive practice: verb and adjective conjugations, hiragana/katakana drills, kanji writing practice, and comprehensive exercises. Features content from Genki and Minna no Nihongo textbooks.',
  keywords: [
    "Japanese practice",
    "conjugation practice",
    "hiragana practice",
    "katakana practice",
    "kanji practice",
    "Japanese drills",
    "Genki exercises",
    "Minna no Nihongo practice"
  ],
  path: '/practice',
  image: '/og-images/og-practice.png'
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Practice",
      "url": "/practice"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <PracticePage />
    </>
  );
}