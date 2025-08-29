import type { Metadata } from 'next';
import ReviewClient from './ReviewClient';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = {
  ...generatePageMetadata({
    title: 'Review Hub',
    description: 'Unified Review Hub - Practice and review kanji, vocabulary, and grammar with spaced repetition. Track your progress and optimize your Japanese learning with intelligent algorithms.',
    path: '/review',
    keywords: 'Japanese review, spaced repetition, kanji review, vocabulary review, SRS, Japanese learning system, study schedule, memory optimization'
  }),
  robots: {
    index: true,
    follow: true,
    noarchive: false,
    nosnippet: false,
  },
};

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Review Hub",
      "url": "/review"
    }
  ]);

  const pageStructuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Doshi Sensei Review Hub",
    "description": "Intelligent Japanese language review hub using spaced repetition for optimal learning retention",
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "Web",
    "url": "https://doshisensei.com/review",
    "featureList": [
      "Spaced repetition algorithm (SRS)",
      "Kanji review sessions",
      "Vocabulary review sessions", 
      "Grammar pattern review",
      "Progress tracking and analytics",
      "Smart notification scheduling",
      "Multiple review algorithms (FSRS, SM2, Simple)",
      "Session customization and preferences"
    ],
    "creator": {
      "@type": "Organization",
      "name": "Doshi Sensei Team"
    },
    "isPartOf": {
      "@type": "WebApplication",
      "name": "Doshi Sensei",
      "url": "https://doshisensei.com"
    }
  };

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <StructuredData data={pageStructuredData} />
      <ReviewClient />
    </>
  );
}