import type { Metadata } from 'next';
import LoginPage from './LoginPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Login',
  description: 'Login - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/login',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Login",
      "url": "/login"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <LoginPage />
    </>
  );
}
