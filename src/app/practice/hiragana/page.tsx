import type { Metadata } from 'next';
import HiraganaClient from './HiraganaClient';

export const metadata: Metadata = {
  title: 'Hiragana | Doshi Sensei',
  description: 'Learn Japanese hiragana with interactive charts, pronunciation guides, and practice tools. Master the foundational Japanese writing system.',
  keywords: [
    'hiragana chart',
    'Japanese hiragana',
    'hiragana practice',
    'learn hiragana',
    'Japanese syllabary',
    'Japanese pronunciation',
    'Japanese learning',
    'hiragana stroke order',
    'Japanese writing system'
  ],
  openGraph: {
    title: 'Learn Hiragana | Doshi Sensei',
    description: 'Interactive Japanese hiragana chart with pronunciation. Study hiragana characters with audio support and practice tools.',
    url: 'https://doshisensei.com/practice/hiragana',
    type: 'website',
    images: [
      {
        url: 'https://doshisensei.com/doshi.png',
        width: 1200,
        height: 630,
        alt: 'Doshi Sensei - Learn Hiragana',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Learn Hiragana | Doshi Sensei',
    description: 'Master Japanese hiragana with interactive charts and practice tools',
    images: ['https://doshisensei.com/doshi.png'],
  },
  alternates: {
    canonical: 'https://doshisensei.com/practice/hiragana',
  },
};

// Structured Data for Hiragana Page
const hiraganaStructuredData = {
  "@context": "https://schema.org",
  "@type": "LearningResource",
  "name": "Japanese Hiragana Chart - Learn Hiragana Characters",
  "description": "Interactive Japanese hiragana chart with pronunciation. Study hiragana characters with audio support and practice tools.",
  "url": "https://doshisensei.com/practice/hiragana",
  "educationalLevel": ["Beginner"],
  "learningResourceType": "Interactive Chart",
  "about": {
    "@type": "Thing",
    "name": "Japanese Hiragana",
    "description": "Hiragana characters with pronunciation"
  },
  "teaches": [
    "Hiragana characters",
    "Japanese syllabary",
    "Japanese pronunciation",
    "Basic Japanese writing",
    "Hiragana stroke order"
  ],
  "educationalRole": "Student",
  "typicalAgeRange": "13-65",
  "interactivityType": "Active",
  "isAccessibleForFree": true,
  "inLanguage": "en",
  "keywords": [
    "hiragana chart",
    "Japanese hiragana",
    "hiragana practice",
    "learn hiragana",
    "Japanese syllabary",
    "Japanese pronunciation",
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
      "name": "Hiragana",
      "item": "https://doshisensei.com/practice/hiragana"
    }
  ]
};

export default function HiraganaPage() {
  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(hiraganaStructuredData),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbData),
        }}
      />
      <HiraganaClient />
    </>
  );
}