import { Metadata } from 'next';
import AchievementsTestClient from './AchievementsTestClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Achievements Test | Doshi Sensei',
  description: 'Achievements Test - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Achievements Test | Doshi Sensei',
    description: 'Achievements Test - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/achievements-test',
  },
  twitter: {
    card: 'summary',
    title: 'Achievements Test | Doshi Sensei',
    description: 'Achievements Test - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Achievements Test - Doshi Sensei",
  "description": "Achievements Test - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/achievements-test",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function AchievementsTestPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <AchievementsTestClient />
    </>
  );
}