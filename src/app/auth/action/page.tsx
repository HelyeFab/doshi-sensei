import type { Metadata } from 'next';
import AuthActionPage from './AuthActionPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Action',
  description: 'Action - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/auth/action',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Action",
      "url": "/action"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <AuthActionPage />
    </>
  );
}
