import type { Metadata } from 'next';
import AchievementsTestPage from './AchievementsTestPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Achievements Test',
  description: 'Achievements Test - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/achievements-test',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Achievements Test",
      "url": "/achievements-test"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <AchievementsTestPage />
    </>
  );
}
