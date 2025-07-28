import { Metadata } from 'next';
import DrillClient from './DrillClient';

export const metadata: Metadata = {
  title: 'Japanese Conjugation Practice - Interactive Grammar Drills',
  description: 'Master Japanese verb and adjective conjugations with interactive drills. Practice verb forms, adjective conjugations, and grammar patterns with instant feedback. Perfect for JLPT preparation.',
  keywords: [
    'Japanese conjugation practice',
    'verb conjugation drill',
    'Japanese grammar quiz',
    'JLPT conjugation',
    'i-adjective conjugation',
    'na-adjective conjugation',
    'Japanese verb forms',
    'polite form practice',
    'past tense Japanese',
    'negative form drill',
    'te-form practice',
    'conditional form',
    'passive form Japanese',
    'causative form',
    'interactive Japanese learning'
  ],
  openGraph: {
    title: 'Japanese Conjugation Practice | Doshi Sensei',
    description: 'Master Japanese verb and adjective conjugations with interactive drills and instant feedback.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Japanese Conjugation Practice | Doshi Sensei',
    description: 'Master Japanese verb and adjective conjugations with interactive drills and instant feedback.',
  },
  alternates: {
    canonical: '/drill',
  },
};

export default function DrillPage() {
  return <DrillClient />;
}