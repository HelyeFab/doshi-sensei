import type { Metadata } from 'next';
import ConversionAnalyticsPage from './ConversionAnalyticsPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Conversions',
  description: 'Conversions - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/admin/analytics/conversions',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Conversions",
      "url": "/conversions"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <ConversionAnalyticsPage />
    </>
  );
}
