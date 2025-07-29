import type { Metadata } from 'next';
import UserEntitlementsPage from './UserEntitlementsPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'User Entitlements',
  description: 'User Entitlements - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/admin/user-entitlements',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "User Entitlements",
      "url": "/user-entitlements"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <UserEntitlementsPage />
    </>
  );
}
