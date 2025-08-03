import type { Metadata } from 'next';
import AdminDashboard from './AdminDashboard';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = generatePageMetadata({
  title: 'Admin',
  description: 'Admin - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/admin',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Admin",
      "url": "/admin"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <AdminDashboard />
    </>
  );
}
