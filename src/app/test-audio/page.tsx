import type { Metadata } from 'next';
import TestAudioPage from './TestAudioPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Test Audio',
  description: 'Test Audio - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/test-audio',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Test Audio",
      "url": "/test-audio"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <TestAudioPage />
    </>
  );
}
