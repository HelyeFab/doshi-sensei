import { Metadata } from 'next';
import ConjugationDrillClient from './ConjugationDrillClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Conjugation | Doshi Sensei',
  description: 'Practice Japanese verb and adjective conjugations with comprehensive exercises.',
  openGraph: {
    title: 'Conjugation | Doshi Sensei',
    description: 'Practice Japanese verb and adjective conjugations with comprehensive exercises.',
    type: 'website',
    url: 'https://doshisensei.com/drill/conjugation',
  },
  twitter: {
    card: 'summary',
    title: 'Conjugation | Doshi Sensei',
    description: 'Practice Japanese verb and adjective conjugations with comprehensive exercises.',
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Conjugation - Doshi Sensei",
  "description": "Practice Japanese verb and adjective conjugations with comprehensive exercises.",
  "url": "https://doshisensei.com/drill/conjugation",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function ConjugationDrillPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <ConjugationDrillClient />
    </>
  );
}