import { Metadata } from 'next';
import WordLearningSessionClient from './WordLearningSessionClient';
import WordLearningSessionStructuredData from './StructuredData';
import { generatePageMetadata } from '@/utils/seo';

export const metadata: Metadata = generatePageMetadata({
  title: 'Word Learning Session - Multimodal Japanese Vocabulary Learning',
  description: 'Learn Japanese vocabulary through interactive multimodal sessions with audio-visual matching, context sentences, and active recall drills.',
  keywords: [
    'Japanese vocabulary',
    'word learning',
    'multimodal learning',
    'active recall',
    'Genki vocabulary',
    'Japanese audio',
    'vocabulary practice'
  ],
  path: '/tools/word-learning-session',
  image: '/og-images/og-tools.png'
});

export default function WordLearningSessionPage() {
  return (
    <>
      <WordLearningSessionStructuredData />
      <WordLearningSessionClient />
    </>
  );
}