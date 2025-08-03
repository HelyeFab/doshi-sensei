import { Metadata } from 'next';
import MyVideos from './MyVideos';
import StructuredData from '@/components/StructuredData';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My Videos | Doshi Sensei',
  description: 'Access your saved YouTube videos and practice history for Japanese shadowing exercises.',
  openGraph: {
    title: 'My Videos | Doshi Sensei',
    description: 'Access your saved YouTube videos and practice history for Japanese shadowing exercises.',
    type: 'website',
    url: 'https://doshisensei.com/tools/my-videos',
  },
  twitter: {
    card: 'summary',
    title: 'My Videos | Doshi Sensei',
    description: 'Access your saved YouTube videos and practice history for Japanese shadowing exercises.',
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "My Videos - Doshi Sensei",
  "description": "Access your saved YouTube videos and practice history for Japanese shadowing exercises.",
  "url": "https://doshisensei.com/tools/my-videos",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function MyVideosPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <MyVideos />
    </>
  );
}