import type { Metadata } from 'next';
import AdminDebugPage from './AdminDebugPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Debug',
  description: 'Debug - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/admin/debug',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Debug",
      "url": "/debug"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <AdminDebugPage />
    </>
  );
}
