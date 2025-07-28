import { Metadata } from 'next';
import MoodBoardsClient from './MoodBoardsClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Mood Boards | Doshi Sensei',
  description: 'Mood Boards - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Mood Boards | Doshi Sensei',
    description: 'Mood Boards - Part of Doshi Sensei's comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/admin/mood-boards',
  },
  twitter: {
    card: 'summary',
    title: 'Mood Boards | Doshi Sensei',
    description: 'Mood Boards - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Mood Boards - Doshi Sensei",
  "description": "Mood Boards - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/admin/mood-boards",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function MoodBoardsPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <MoodBoardsClient />
    </>
  );
}