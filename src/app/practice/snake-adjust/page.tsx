import type { Metadata } from 'next';
import SnakeAdjustPage from './SnakeAdjustPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Snake Adjust',
  description: 'Snake Adjust - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/practice/snake-adjust',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Snake Adjust",
      "url": "/snake-adjust"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <SnakeAdjustPage />
    </>
  );
}
