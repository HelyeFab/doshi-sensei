import { Metadata } from 'next';
import AchievementsClient from './AchievementsClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Achievements | Doshi Sensei',
  description: 'Track your Japanese learning progress with achievements, unlock rewards, and celebrate milestones on your journey to fluency.',
  keywords: [
    'Japanese learning achievements',
    'language learning rewards',
    'study progress tracking',
    'Japanese milestones',
    'gamified learning'
  ],
  openGraph: {
    title: 'Achievements | Doshi Sensei',
    description: 'Track your Japanese learning progress with achievements and unlock rewards.',
    type: 'website',
    url: 'https://doshisensei.com/achievements',
  },
  twitter: {
    card: 'summary',
    title: 'Achievements | Doshi Sensei',
    description: 'Track your progress and unlock rewards in your Japanese learning journey.',
  },
};

const achievementsStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Achievements - Doshi Sensei",
  "description": "Track your Japanese learning progress with achievements and rewards",
  "url": "https://doshisensei.com/achievements",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function AchievementsPage() {
  return (
    <>
      <StructuredData data={achievementsStructuredData} />
      <AchievementsClient />
    </>
  );
}