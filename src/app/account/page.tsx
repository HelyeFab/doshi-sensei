import type { Metadata } from 'next';
import { Suspense } from 'react';
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
      <Suspense fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading account...</p>
          </div>
        </div>
      }>
        <AccountPage />
      </Suspense>
    </>
  );
}