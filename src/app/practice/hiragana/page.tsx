import type { Metadata } from 'next';
import HiraganaPage from './HiraganaPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Hiragana',
  description: 'Hiragana - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/practice/hiragana',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Hiragana",
      "url": "/hiragana"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <HiraganaPage />
    </>
  );
}
