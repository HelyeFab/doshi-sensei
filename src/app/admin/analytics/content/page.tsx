import type { Metadata } from 'next';
import ContentAnalyticsPage from './ContentAnalyticsPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Content',
  description: 'Content - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/admin/analytics/content',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Content",
      "url": "/content"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <ContentAnalyticsPage />
    </>
  );
}
