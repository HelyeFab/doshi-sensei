import type { Metadata } from 'next';
import GenerateStoryPage from './GenerateStoryPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Generate',
  description: 'Generate - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/admin/stories/generate',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Generate",
      "url": "/generate"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <GenerateStoryPage />
    </>
  );
}
