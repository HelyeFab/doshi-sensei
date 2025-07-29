import type { Metadata } from 'next';
import SnakeDemoPage from './SnakeDemoPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Snake Demo',
  description: 'Snake Demo - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/practice/snake-demo',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Snake Demo",
      "url": "/snake-demo"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <SnakeDemoPage />
    </>
  );
}
