import { Metadata } from 'next';
import AdminFeaturesClient from './AdminFeaturesClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Features | Doshi Sensei',
  description: 'Features - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Features | Doshi Sensei',
    description: 'Features - Part of Doshi Sensei's comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/admin/features',
  },
  twitter: {
    card: 'summary',
    title: 'Features | Doshi Sensei',
    description: 'Features - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Features - Doshi Sensei",
  "description": "Features - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/admin/features",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function AdminFeaturesPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <AdminFeaturesClient />
    </>
  );
}