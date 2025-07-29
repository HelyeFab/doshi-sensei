import type { Metadata } from 'next';
import TestShadowingPage from './TestShadowingPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Test Shadowing',
  description: 'Test Shadowing - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/test-shadowing',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Test Shadowing",
      "url": "/test-shadowing"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <TestShadowingPage />
    </>
  );
}
