import type { Metadata } from 'next';
import KanjiBrowserPage from './KanjiBrowserPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Kanji Browser - JLPT, Grade Levels & Radicals',
  description: 'Browse and study kanji organized by JLPT levels (N5-N1), school grades, or radicals. View stroke order animations, meanings, readings, compounds, and example sentences for over 2,000 kanji.',
  keywords: [
    "kanji browser",
    "JLPT kanji",
    "kanji by grade",
    "kanji radicals",
    "stroke order",
    "kanji dictionary",
    "kanji study",
    "N5 kanji",
    "N4 kanji",
    "N3 kanji",
    "N2 kanji",
    "N1 kanji"
  ],
  path: '/kanji-browser',
  image: '/og-images/og-kanji.png'
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Kanji Browser",
      "url": "/kanji-browser"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <KanjiBrowserPage />
    </>
  );
}
