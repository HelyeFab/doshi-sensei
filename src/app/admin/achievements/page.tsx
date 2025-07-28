import { Metadata } from 'next';
import AdminAchievementsClient from './AdminAchievementsClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Achievements | Doshi Sensei',
  description: 'Achievements - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Achievements | Doshi Sensei',
    description: 'Achievements - Part of Doshi Sensei's comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/admin/achievements',
  },
  twitter: {
    card: 'summary',
    title: 'Achievements | Doshi Sensei',
    description: 'Achievements - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Achievements - Doshi Sensei",
  "description": "Achievements - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/admin/achievements",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function AdminAchievementsPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <AdminAchievementsClient />
    </>
  );
}