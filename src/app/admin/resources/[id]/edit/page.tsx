import type { Metadata } from 'next';
import EditResourcePage from './EditResourcePage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = generatePageMetadata({
  title: 'Edit',
  description: 'Edit - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/admin/resources/[id]/edit',
});

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Edit",
      "url": "/edit"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <EditResourcePage params={params} />
    </>
  );
}
