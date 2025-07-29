import type { Metadata } from 'next';
import NewMoodBoardPage from './NewMoodBoardPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'New',
  description: 'New - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/admin/mood-boards/new',
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
      <NewMoodBoardPage />
    </>
  );
}
