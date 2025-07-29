import type { Metadata } from 'next';
import ReadingRoutesPage from './ReadingRoutesPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Reading Routes',
  description: 'Reading Routes - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/games/reading-routes',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Reading Routes",
      "url": "/reading-routes"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <ReadingRoutesPage />
    </>
  );
}
