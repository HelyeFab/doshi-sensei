import { Metadata } from 'next';
import WordLearningSessionClient from './WordLearningSessionClient';
import { generatePageMetadata } from '@/lib/structured-data';

export const metadata: Metadata = {
  title: 'Word Learning Session | Doshi Sensei',
  description: 'Multimodal session for learning new Japanese words with audio-visual matching and active recall',
  openGraph: {
    title: 'Word Learning Session | Doshi Sensei',
    description: 'Learn Japanese vocabulary through interactive multimodal sessions',
  },
  ...generatePageMetadata('/tools/word-learning-session', true),
};

export default function WordLearningSessionPage() {
  return <WordLearningSessionClient />;
}