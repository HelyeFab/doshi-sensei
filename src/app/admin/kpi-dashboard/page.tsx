import type { Metadata } from 'next';
import KPIDashboardPage from './KPIDashboardPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Kpi Dashboard',
  description: 'Kpi Dashboard - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/admin/kpi-dashboard',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Kpi Dashboard",
      "url": "/kpi-dashboard"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <KPIDashboardPage />
    </>
  );
}
