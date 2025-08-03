import type { Metadata } from 'next';
import ArticlesManagementPage from './ArticlesManagementPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = generatePageMetadata({
  title: 'Articles',
  description: 'Articles - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/admin/articles',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Articles",
      "url": "/articles"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <ArticlesManagementPage />
    </>
  );
}
