import type { Metadata } from 'next';
import MoodBoardsPage from './MoodBoardsPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = generatePageMetadata({
  title: 'Mood Boards',
  description: 'Mood Boards - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/admin/mood-boards',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Mood Boards",
      "url": "/mood-boards"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <MoodBoardsPage />
    </>
  );
}
