import type { Metadata } from 'next';
import AdminResourcesPage from './AdminResourcesPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = generatePageMetadata({
  title: 'Resources',
  description: 'Resources - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/admin/resources',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Resources",
      "url": "/resources"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <AdminResourcesPage />
    </>
  );
}
