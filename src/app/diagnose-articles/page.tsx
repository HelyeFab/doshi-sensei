import type { Metadata } from 'next';
import DiagnoseArticlesPage from './DiagnoseArticlesPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Diagnose Articles',
  description: 'Diagnose Articles - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/diagnose-articles',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Diagnose Articles",
      "url": "/diagnose-articles"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <DiagnoseArticlesPage />
    </>
  );
}
