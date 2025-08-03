import type { Metadata } from 'next';
import AdminSnakePathPage from './AdminSnakePathPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = generatePageMetadata({
  title: 'Snake Path',
  description: 'Snake Path - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/admin/snake-path',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Snake Path",
      "url": "/snake-path"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <AdminSnakePathPage />
    </>
  );
}
