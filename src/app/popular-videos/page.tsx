import { Metadata } from 'next';
import PopularVideos from './PopularVideos';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Popular Videos | Doshi Sensei',
  description: 'Browse the most popular Japanese YouTube videos for shadowing practice. Learn from content loved by the community.',
  openGraph: {
    title: 'Popular Videos | Doshi Sensei',
    description: 'Browse the most popular Japanese YouTube videos for shadowing practice. Learn from content loved by the community.',
    type: 'website',
    url: 'https://doshisensei.com/popular-videos',
  },
  twitter: {
    card: 'summary',
    title: 'Popular Videos | Doshi Sensei',
    description: 'Browse the most popular Japanese YouTube videos for shadowing practice. Learn from content loved by the community.',
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Popular Videos - Doshi Sensei",
  "description": "Browse the most popular Japanese YouTube videos for shadowing practice. Learn from content loved by the community.",
  "url": "https://doshisensei.com/popular-videos",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function PopularVideos() {
  return (
    <>
      <StructuredData data={structuredData} />
      <PopularVideos />
    </>
  );
}