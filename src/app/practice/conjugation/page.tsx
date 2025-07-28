import { Metadata } from 'next';
import ConjugationClient from './ConjugationClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Conjugation | Doshi Sensei',
  description: 'Practice Japanese verb and adjective conjugations with comprehensive exercises.',
  openGraph: {
    title: 'Conjugation | Doshi Sensei',
    description: 'Practice Japanese verb and adjective conjugations with comprehensive exercises.',
    type: 'website',
    url: 'https://doshisensei.com/practice/conjugation',
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
  "url": "https://doshisensei.com/practice/conjugation",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function ConjugationPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <ConjugationClient />
    </>
  );
}