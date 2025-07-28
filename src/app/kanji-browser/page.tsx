import { Metadata } from 'next';
import KanjiBrowserClient from './KanjiBrowserClient';

export const metadata: Metadata = {
  title: 'Kanji Browser - Study by JLPT Level',
  description: 'Browse and study kanji organized by JLPT levels N5 to N1. View stroke order animations, meanings, readings, and example words. Perfect for systematic kanji learning and JLPT preparation.',
  keywords: [
    'kanji browser',
    'JLPT kanji',
    'kanji by level',
    'N5 kanji',
    'N4 kanji', 
    'N3 kanji',
    'N2 kanji',
    'N1 kanji',
    'kanji study',
    'stroke order',
    'kanji meanings',
    'kanji readings',
    'JLPT preparation',
    'systematic kanji learning'
  ],
  openGraph: {
    title: 'Kanji Browser - Study by JLPT Level | Doshi Sensei',
    description: 'Browse and study kanji organized by JLPT levels. View stroke order animations, meanings, and readings.',
    type: 'website',
  },
  alternates: {
    canonical: '/kanji-browser',
  },
};

const kanjiBrowserStructuredData = {
  "@context": "https://schema.org",
  "@type": "EducationalMaterial",
  "name": "JLPT Kanji Browser - Doshi Sensei",
  "description": "Browse and study kanji organized by JLPT levels N5 to N1 with stroke order animations and detailed information.",
  "url": "https://doshisensei.com/kanji-browser",
  "educationalLevel": "JLPT N5-N1",
  "learningResourceType": "Reference Material",
  "isPartOf": {
    "@type": "WebApplication",
    "name": "Doshi Sensei"
  },
  "teaches": {
    "@type": "DefinedTerm",
    "name": "Japanese Kanji",
    "description": "Chinese characters used in Japanese writing"
  }
};

export default function KanjiBrowserPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(kanjiBrowserStructuredData),
        }}
      />
      <KanjiBrowserClient />
    </>
  );
}