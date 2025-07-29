import type { Metadata } from 'next';
import ResetPasswordPage from './ResetPasswordPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Reset Password',
  description: 'Reset Password - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/reset-password',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Reset Password",
      "url": "/reset-password"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <ResetPasswordPage />
    </>
  );
}
