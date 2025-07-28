import { Metadata } from 'next';
import NewMoodBoardClient from './NewMoodBoardClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'New | Doshi Sensei',
  description: 'New - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  openGraph: {
    title: 'New | Doshi Sensei',
    description: 'New - Part of Doshi Sensei's comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/admin/mood-boards/new',
  },
  twitter: {
    card: 'summary',
    title: 'New | Doshi Sensei',
    description: 'New - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "New - Doshi Sensei",
  "description": "New - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/admin/mood-boards/new",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function NewMoodBoardPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <NewMoodBoardClient />
    </>
  );
}