import { Metadata } from 'next';
import StrokeOrderPracticeClient from './StrokeOrderPracticeClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Stroke Order Practice | Doshi Sensei',
  description: 'Learn proper kanji stroke order with interactive drawing exercises.',
  openGraph: {
    title: 'Stroke Order Practice | Doshi Sensei',
    description: 'Learn proper kanji stroke order with interactive drawing exercises.',
    type: 'website',
    url: 'https://doshisensei.com/games/stroke-order-practice',
  },
  twitter: {
    card: 'summary',
    title: 'Stroke Order Practice | Doshi Sensei',
    description: 'Learn proper kanji stroke order with interactive drawing exercises.',
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Stroke Order Practice - Doshi Sensei",
  "description": "Learn proper kanji stroke order with interactive drawing exercises.",
  "url": "https://doshisensei.com/games/stroke-order-practice",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function StrokeOrderPracticePage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <StrokeOrderPracticeClient />
    </>
  );
}