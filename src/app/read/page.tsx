import type { Metadata } from 'next';
import ReadPage from './ReadPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Read',
  description: 'Read - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/read',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Read",
      "url": "/read"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <ReadPage />
    </>
  );
}
