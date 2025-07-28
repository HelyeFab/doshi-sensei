import { Metadata } from 'next';
import AdminLogsClient from './AdminLogsClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Logs | Doshi Sensei',
  description: 'Logs - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Logs | Doshi Sensei',
    description: 'Logs - Part of Doshi Sensei's comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/admin/logs',
  },
  twitter: {
    card: 'summary',
    title: 'Logs | Doshi Sensei',
    description: 'Logs - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Logs - Doshi Sensei",
  "description": "Logs - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/admin/logs",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function AdminLogsPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <AdminLogsClient />
    </>
  );
}