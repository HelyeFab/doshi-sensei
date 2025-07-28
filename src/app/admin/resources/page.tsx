import { Metadata } from 'next';
import AdminResourcesClient from './AdminResourcesClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Resources | Doshi Sensei',
  description: 'Resources - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Resources | Doshi Sensei',
    description: 'Resources - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/admin/resources',
  },
  twitter: {
    card: 'summary',
    title: 'Resources | Doshi Sensei',
    description: 'Resources - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Resources - Doshi Sensei",
  "description": "Resources - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/admin/resources",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function AdminResourcesPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <AdminResourcesClient />
    </>
  );
}