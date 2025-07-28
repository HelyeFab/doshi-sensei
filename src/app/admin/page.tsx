import { Metadata } from 'next';
import AdminDashboard from './AdminDashboard';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Admin | Doshi Sensei',
  description: 'Admin - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Admin | Doshi Sensei',
    description: 'Admin - Part of Doshi Sensei's comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/admin',
  },
  twitter: {
    card: 'summary',
    title: 'Admin | Doshi Sensei',
    description: 'Admin - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Admin - Doshi Sensei",
  "description": "Admin - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/admin",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function AdminDashboard() {
  return (
    <>
      <StructuredData data={structuredData} />
      <AdminDashboard />
    </>
  );
}