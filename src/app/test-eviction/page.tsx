import type { Metadata } from 'next';
import TestEvictionPage from './TestEvictionPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Test Eviction',
  description: 'Test Eviction - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/test-eviction',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Test Eviction",
      "url": "/test-eviction"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <TestEvictionPage />
    </>
  );
}
