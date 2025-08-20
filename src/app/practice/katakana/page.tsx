import type { Metadata } from 'next';
import KatakanaClient from './KatakanaClient';

export const metadata: Metadata = {
  title: 'Katakana | Doshi Sensei',
  description: 'Learn Japanese katakana with interactive charts, pronunciation guides, and practice tools. Master the Japanese writing system for foreign words.',
  keywords: [
    'katakana chart',
    'Japanese katakana',
    'katakana practice',
    'learn katakana',
    'Japanese syllabary',
    'Japanese foreign words',
    'Japanese learning',
    'katakana stroke order',
    'Japanese writing system'
  ],
  openGraph: {
    title: 'Learn Katakana | Doshi Sensei',
    description: 'Interactive Japanese katakana chart with pronunciation. Study katakana characters with audio support and practice tools.',
    url: 'https://doshisensei.com/practice/katakana',
    type: 'website',
    images: [
      {
        url: 'https://doshisensei.com/doshi.png',
        width: 1200,
        height: 630,
        alt: 'Doshi Sensei - Learn Katakana',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Learn Katakana | Doshi Sensei',
    description: 'Master Japanese katakana with interactive charts and practice tools',
    images: ['https://doshisensei.com/doshi.png'],
  },
  alternates: {
    canonical: 'https://doshisensei.com/practice/katakana',
  },
};

// Structured Data for Katakana Page
const katakanaStructuredData = {
  "@context": "https://schema.org",
  "@type": "LearningResource",
  "name": "Japanese Katakana Chart - Learn Katakana Characters",
  "description": "Interactive Japanese katakana chart with pronunciation. Study katakana characters used for foreign words with audio support and practice tools.",
  "url": "https://doshisensei.com/practice/katakana",
  "educationalLevel": ["Beginner"],
  "learningResourceType": "Interactive Chart",
  "about": {
    "@type": "Thing",
    "name": "Japanese Katakana",
    "description": "Katakana characters for foreign words"
  },
  "teaches": [
    "Katakana characters",
    "Japanese syllabary for foreign words",
    "Japanese pronunciation",
    "Basic Japanese writing",
    "Katakana stroke order"
  ],
  "educationalRole": "Student",
  "typicalAgeRange": "13-65",
  "interactivityType": "Active",
  "isAccessibleForFree": true,
  "inLanguage": "en",
  "keywords": [
    "katakana chart",
    "Japanese katakana",
    "katakana practice",
    "learn katakana",
    "Japanese syllabary",
    "Japanese foreign words",
    "Japanese learning"
  ],
  "provider": {
    "@type": "Organization",
    "name": "Doshi Sensei",
    "url": "https://doshisensei.com"
  }
};

// Breadcrumb structured data
const breadcrumbData = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://doshisensei.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Practice",
      "item": "https://doshisensei.com/practice"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Katakana",
      "item": "https://doshisensei.com/practice/katakana"
    }
  ]
};

export default function KatakanaPage() {
  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(katakanaStructuredData),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbData),
        }}
      />
      <KatakanaClient />
    </>
  );
}