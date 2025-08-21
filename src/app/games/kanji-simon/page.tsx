import type { Metadata } from 'next';
import KanjiSimonPage from './KanjiSimonPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Kanji Simon',
  description: 'Kanji Simon - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/games/kanji-simon',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Kanji Simon",
      "url": "/kanji-simon"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <KanjiSimonPage />
    </>
  );
}