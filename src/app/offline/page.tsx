import type { Metadata } from 'next';
import OfflinePage from './OfflinePage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Offline',
  description: 'Offline - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/offline',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Offline",
      "url": "/offline"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <OfflinePage />
    </>
  );
}
