import type { Metadata } from 'next';
import ThreePillarIntegrationTestPage from './ThreePillarIntegrationTestPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Test Three Pillar Integration',
  description: 'Test Three Pillar Integration - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/test-three-pillar-integration',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Test Three Pillar Integration",
      "url": "/test-three-pillar-integration"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <ThreePillarIntegrationTestPage />
    </>
  );
}
