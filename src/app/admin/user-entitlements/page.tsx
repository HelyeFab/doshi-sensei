import { Metadata } from 'next';
import UserEntitlementsClient from './UserEntitlementsClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'User Entitlements | Doshi Sensei',
  description: 'User Entitlements - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  openGraph: {
    title: 'User Entitlements | Doshi Sensei',
    description: 'User Entitlements - Part of Doshi Sensei's comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/admin/user-entitlements',
  },
  twitter: {
    card: 'summary',
    title: 'User Entitlements | Doshi Sensei',
    description: 'User Entitlements - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "User Entitlements - Doshi Sensei",
  "description": "User Entitlements - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/admin/user-entitlements",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function UserEntitlementsPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <UserEntitlementsClient />
    </>
  );
}