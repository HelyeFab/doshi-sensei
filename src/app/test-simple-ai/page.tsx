import type { Metadata } from 'next';
import TestSimpleAI from './TestSimpleAI';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Test Simple Ai',
  description: 'Test Simple Ai - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/test-simple-ai',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Test Simple Ai",
      "url": "/test-simple-ai"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <TestSimpleAI />
    </>
  );
}
