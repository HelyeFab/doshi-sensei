import type { Metadata } from 'next';
import TestMinimalAI from './TestMinimalAI';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Test Minimal Ai',
  description: 'Test Minimal Ai - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/test-minimal-ai',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Test Minimal Ai",
      "url": "/test-minimal-ai"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <TestMinimalAI />
    </>
  );
}
