import type { Metadata } from 'next';
import ResourcePostPage from './ResourcePostPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: '[slug]',
  description: '[slug] - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/resources/[slug]',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "[slug]",
      "url": "/[slug]"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <ResourcePostPage />
    </>
  );
}
