import type { Metadata } from 'next';
import AdminFeaturesPage from './AdminFeaturesPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = generatePageMetadata({
  title: 'Features',
  description: 'Features - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/admin/features',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Features",
      "url": "/features"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <AdminFeaturesPage />
    </>
  );
}
