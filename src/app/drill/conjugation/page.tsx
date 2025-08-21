import type { Metadata } from 'next';
import ConjugationDrillPage from './ConjugationDrillPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Conjugation',
  description: 'Conjugation - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/drill/conjugation',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Conjugation",
      "url": "/conjugation"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <ConjugationDrillPage />
    </>
  );
}