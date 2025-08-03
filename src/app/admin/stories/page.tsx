import type { Metadata } from 'next';
import AdminStoriesPage from './AdminStoriesPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = generatePageMetadata({
  title: 'Stories',
  description: 'Stories - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/admin/stories',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Stories",
      "url": "/stories"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <AdminStoriesPage />
    </>
  );
}
