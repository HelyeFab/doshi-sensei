import type { Metadata } from 'next';
import KanaPage from './KanaPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Kana',
  description: 'Kana - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/practice/kana',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Kana",
      "url": "/kana"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <KanaPage />
    </>
  );
}
