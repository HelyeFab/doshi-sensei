import { Metadata } from 'next';
import AdminStoriesClient from './AdminStoriesClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Stories | Doshi Sensei',
  description: 'Stories - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Stories | Doshi Sensei',
    description: 'Stories - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/admin/stories',
  },
  twitter: {
    card: 'summary',
    title: 'Stories | Doshi Sensei',
    description: 'Stories - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Stories - Doshi Sensei",
  "description": "Stories - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/admin/stories",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function AdminStoriesPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <AdminStoriesClient />
    </>
  );
}