import type { Metadata } from 'next';
import PrivacyPolicyPage from './PrivacyPolicyPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Privacy Policy',
  description: 'Privacy Policy - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/settings/privacy-policy',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Privacy Policy",
      "url": "/privacy-policy"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <PrivacyPolicyPage />
    </>
  );
}
