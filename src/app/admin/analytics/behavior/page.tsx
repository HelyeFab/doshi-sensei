import { Metadata } from 'next';
import UserBehaviorClient from './UserBehaviorClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Behavior | Doshi Sensei',
  description: 'Behavior - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Behavior | Doshi Sensei',
    description: 'Behavior - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/admin/analytics/behavior',
  },
  twitter: {
    card: 'summary',
    title: 'Behavior | Doshi Sensei',
    description: 'Behavior - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Behavior - Doshi Sensei",
  "description": "Behavior - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/admin/analytics/behavior",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function UserBehaviorPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <UserBehaviorClient />
    </>
  );
}