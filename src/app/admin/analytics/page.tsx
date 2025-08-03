import type { Metadata } from 'next';
import AnalyticsOverview from './AnalyticsOverview';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = generatePageMetadata({
  title: 'Analytics',
  description: 'Analytics - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/admin/analytics',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Analytics",
      "url": "/analytics"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <AnalyticsOverview />
    </>
  );
}
