import type { Metadata } from 'next';
import UserBehaviorPage from './UserBehaviorPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Behavior',
  description: 'Behavior - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/admin/analytics/behavior',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Behavior",
      "url": "/behavior"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <UserBehaviorPage />
    </>
  );
}
