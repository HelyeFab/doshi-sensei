import type { Metadata } from 'next';
import KatakanaPage from './KatakanaPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Katakana',
  description: 'Katakana - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/practice/katakana',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Katakana",
      "url": "/katakana"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <KatakanaPage />
    </>
  );
}
