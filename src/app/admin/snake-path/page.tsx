import { Metadata } from 'next';
import AdminSnakePathClient from './AdminSnakePathClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Snake Path | Doshi Sensei',
  description: 'Snake Path - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Snake Path | Doshi Sensei',
    description: 'Snake Path - Part of Doshi Sensei's comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/admin/snake-path',
  },
  twitter: {
    card: 'summary',
    title: 'Snake Path | Doshi Sensei',
    description: 'Snake Path - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Snake Path - Doshi Sensei",
  "description": "Snake Path - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/admin/snake-path",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function AdminSnakePathPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <AdminSnakePathClient />
    </>
  );
}