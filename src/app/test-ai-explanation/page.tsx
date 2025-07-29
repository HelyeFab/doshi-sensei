import type { Metadata } from 'next';
import TestAIExplanation from './TestAIExplanation';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Test Ai Explanation',
  description: 'Test Ai Explanation - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/test-ai-explanation',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Test Ai Explanation",
      "url": "/test-ai-explanation"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <TestAIExplanation />
    </>
  );
}
