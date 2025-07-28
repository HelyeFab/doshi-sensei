import { Metadata } from 'next';
import AdminDebugClient from './AdminDebugClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Debug | Doshi Sensei',
  description: 'Debug - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Debug | Doshi Sensei',
    description: 'Debug - Part of Doshi Sensei's comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/admin/debug',
  },
  twitter: {
    card: 'summary',
    title: 'Debug | Doshi Sensei',
    description: 'Debug - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Debug - Doshi Sensei",
  "description": "Debug - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/admin/debug",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function AdminDebugPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <AdminDebugClient />
    </>
  );
}