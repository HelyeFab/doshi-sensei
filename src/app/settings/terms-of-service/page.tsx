import type { Metadata } from 'next';
import TermsOfServicePage from './TermsOfServicePage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Terms Of Service',
  description: 'Terms Of Service - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/settings/terms-of-service',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Terms Of Service",
      "url": "/terms-of-service"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <TermsOfServicePage />
    </>
  );
}
