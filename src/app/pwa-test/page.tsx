import type { Metadata } from 'next';
import PWATestPage from './PWATestPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Pwa Test',
  description: 'Pwa Test - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/pwa-test',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Pwa Test",
      "url": "/pwa-test"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <PWATestPage />
    </>
  );
}
