import type { Metadata } from 'next';
import VerifyEmailPage from './VerifyEmailPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Verify Email',
  description: 'Verify Email - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/verify-email',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Verify Email",
      "url": "/verify-email"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <VerifyEmailPage />
    </>
  );
}
