import type { Metadata } from 'next';
import NewResourcePage from './NewResourcePage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = generatePageMetadata({
  title: 'New',
  description: 'New - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/admin/resources/new',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "New",
      "url": "/new"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <NewResourcePage />
    </>
  );
}
