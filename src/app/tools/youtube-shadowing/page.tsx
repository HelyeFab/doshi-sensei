import { Metadata } from 'next';
import YouTubeShadowing from './YouTubeShadowing';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'YouTube Shadowing | Doshi Sensei',
  description: 'Practice Japanese pronunciation with YouTube video shadowing. Extract transcripts and practice speaking along with native speakers.',
  openGraph: {
    title: 'YouTube Shadowing | Doshi Sensei',
    description: 'Practice Japanese pronunciation with YouTube video shadowing. Extract transcripts and practice speaking along with native speakers.',
    type: 'website',
    url: 'https://doshisensei.com/tools/youtube-shadowing',
  },
  twitter: {
    card: 'summary',
    title: 'YouTube Shadowing | Doshi Sensei',
    description: 'Practice Japanese pronunciation with YouTube video shadowing. Extract transcripts and practice speaking along with native speakers.',
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "YouTube Shadowing - Doshi Sensei",
  "description": "Practice Japanese pronunciation with YouTube video shadowing. Extract transcripts and practice speaking along with native speakers.",
  "url": "https://doshisensei.com/tools/youtube-shadowing",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function YouTubeShadowing() {
  return (
    <>
      <StructuredData data={structuredData} />
      <YouTubeShadowing />
    </>
  );
}