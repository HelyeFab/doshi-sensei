import type { Metadata } from 'next';
import AdminYouTubeSeriesPage from './AdminYouTubeSeriesPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = generatePageMetadata({
  title: 'YouTube Series Management',
  description: 'Manage YouTube channel monitoring and automatic resource generation',
  path: '/admin/youtube-series',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Admin",
      "url": "/admin"
    },
    {
      "name": "YouTube Series",
      "url": "/admin/youtube-series"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <AdminYouTubeSeriesPage />
    </>
  );
}