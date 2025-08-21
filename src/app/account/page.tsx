import type { Metadata } from 'next';
import AccountPage from './AccountPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = {
  ...generatePageMetadata({
    title: 'My Account',
    description: 'Manage your Dōshi Sensei account, subscription, study progress, and achievements',
    path: '/account',
  }),
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
};

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Account",
      "url": "/account"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <AccountPage />
    </>
  );
}