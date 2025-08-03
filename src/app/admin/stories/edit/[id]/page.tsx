import type { Metadata } from 'next';
import EditStoryPage from './EditStoryPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = generatePageMetadata({
  title: '[id]',
  description: '[id] - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/admin/stories/edit/[id]',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "[id]",
      "url": "/[id]"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <EditStoryPage />
    </>
  );
}
