import { Metadata } from 'next';
import ActivitiesClient from './ActivitiesClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Activities | Doshi Sensei',
  description: 'Activities - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Activities | Doshi Sensei',
    description: 'Activities - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/admin/activities',
  },
  twitter: {
    card: 'summary',
    title: 'Activities | Doshi Sensei',
    description: 'Activities - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Activities - Doshi Sensei",
  "description": "Activities - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/admin/activities",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function ActivitiesPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <ActivitiesClient />
    </>
  );
}