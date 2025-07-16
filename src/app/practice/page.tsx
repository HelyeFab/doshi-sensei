'use client';

import { useState } from 'react';
import { useStrings } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/PageHeader';
import { useRouter } from 'next/navigation';

// Structured Data for Practice Page
const practiceStructuredData = {
  "@context": "https://schema.org",
  "@type": "LearningResource",
  "name": "Japanese Language Practice - Conjugation & Kana",
  "description": "Interactive Japanese verb and adjective conjugation practice with detailed explanations. Study hiragana and katakana charts with pronunciation.",
  "url": "https://doshisensei.com/practice",
  "educationalLevel": ["Beginner", "Intermediate", "Advanced"],
  "learningResourceType": "Interactive Practice",
  "about": {
    "@type": "Thing",
    "name": "Japanese Language",
    "description": "Japanese verb conjugations, grammar, vocabulary, hiragana and katakana"
  },
  "teaches": [
    "Japanese verb conjugation",
    "Ichidan verb forms",
    "Godan verb forms",
    "Irregular verb forms",
    "I-adjective conjugation",
    "Na-adjective conjugation",
    "JLPT grammar patterns",
    "Hiragana characters",
    "Katakana characters",
    "Japanese syllabary"
  ],
  "educationalRole": "Student",
  "typicalAgeRange": "13-65",
  "interactivityType": "Active",
  "isAccessibleForFree": true,
  "inLanguage": "en",
  "keywords": [
    "Japanese practice",
    "verb conjugation",
    "Japanese grammar",
    "JLPT preparation",
    "Japanese learning",
    "ichidan verbs",
    "godan verbs",
    "hiragana chart",
    "katakana chart",
    "kana practice"
  ]
};

export default function PracticePage() {
  const strings = useStrings();
  const router = useRouter();

  const handleNavigateToKana = () => {
    router.push('/practice/kana');
  };

  const handleNavigateToConjugation = () => {
    router.push('/practice/conjugation');
  };

    return (
    <>
      {/* Virtual Companion Section - 1/6th of screen height */}
      <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />

        {/* Gradient to White Fade */}
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />

        {/* Virtual Companion Button positioned within this section */}
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 min-h-screen pb-24 md:pb-8">
        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(practiceStructuredData),
          }}
        />

        <main className="max-w-7xl mx-auto mb-32 md:mb-8 pb-safe">
          {/* Page Header */}
          <PageHeader title={strings.practice?.title || "Practice Mode"} helpKey="practice" />

          {/* Icons - Clickable to navigate to different features */}
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={handleNavigateToKana}
              className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center hover:bg-primary/20 hover:border-primary/30 transition-colors cursor-pointer"
              title="Go to Kana Charts"
            >
              <img
                src="/flat-icons/root-icons/logogram.svg"
                alt="Logogram Icon"
                className="w-8 h-8"
              />
            </button>
            <button
              onClick={handleNavigateToConjugation}
              className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center hover:bg-primary/20 hover:border-primary/30 transition-colors cursor-pointer"
              title="Go to Conjugation Practice"
            >
              <img
                src="/flat-icons/root-icons/target.svg"
                alt="Target Icon"
                className="w-8 h-8"
              />
            </button>
          </div>
        </main>
      </div>
    </>
  );
}


