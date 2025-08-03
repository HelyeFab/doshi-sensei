import type { Metadata } from 'next';
import ActivitiesPage from './ActivitiesPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = generatePageMetadata({
  title: 'Activities',
  description: 'Activities - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/admin/activities',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Activities",
      "url": "/activities"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <ActivitiesPage />
    </>
  );
}
