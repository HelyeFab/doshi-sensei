import { Metadata } from 'next';
import GenerateStoryClient from './GenerateStoryClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Generate | Doshi Sensei',
  description: 'Generate - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Generate | Doshi Sensei',
    description: 'Generate - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/admin/stories/generate',
  },
  twitter: {
    card: 'summary',
    title: 'Generate | Doshi Sensei',
    description: 'Generate - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Generate - Doshi Sensei",
  "description": "Generate - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/admin/stories/generate",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function GenerateStoryPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <GenerateStoryClient />
    </>
  );
}