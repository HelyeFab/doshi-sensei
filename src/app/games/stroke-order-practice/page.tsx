import type { Metadata } from 'next';
import StrokeOrderPracticePage from './StrokeOrderPracticePage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Stroke Order Practice',
  description: 'Stroke Order Practice - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/games/stroke-order-practice',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Stroke Order Practice",
      "url": "/stroke-order-practice"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <StrokeOrderPracticePage />
    </>
  );
}