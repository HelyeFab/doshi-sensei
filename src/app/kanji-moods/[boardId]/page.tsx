import type { Metadata } from 'next';
import MoodBoardPage from './MoodBoardPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: '[boardId]',
  description: '[boardId] - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/kanji-moods/[boardId]',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "[boardId]",
      "url": "/[boardId]"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <MoodBoardPage />
    </>
  );
}
