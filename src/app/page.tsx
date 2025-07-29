import type { Metadata } from 'next';
import Home from './Home';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Dōshi Sensei - The Ultimate Japanese Learning Platform',
  description: 'Master Japanese with our all-in-one platform: verb conjugations, JLPT kanji study, themed kanji mood boards, complete vocabulary sets from Genki I & II and Minna no Nihongo I & II textbooks, practice with Jisho/WaniKani integration, import Anki decks, read NHK news with furigana, enjoy AI-generated stories, practice YouTube shadowing, play interactive learning games, access comprehensive grammar resources from Japanese creators, and build fluency with our all-in-one toolkit.',
  keywords: [
    'Japanese learning platform',
    'Japanese verb conjugation',
    'JLPT kanji study',
    'kanji mood boards',
    'Genki vocabulary',
    'Genki I and II',
    'Minna no Nihongo vocabulary',
    'Minna no Nihongo I and II',
    'Jisho vocabulary',
    'WaniKani integration',
    'Anki deck import',
    'Japanese flashcards',
    'YouTube shadowing practice',
    'NHK news reading',
    'AI Japanese stories',
    'Japanese learning games',
    'Japanese grammar resources',
    'hiragana katakana practice',
    'spaced repetition Japanese',
    'comprehensive Japanese study',
    'Japanese language app'
  ],
  path: '/',
});

export default function Page() {
  return (
    <>
      <StructuredData data={structuredData.website} />
      <StructuredData data={structuredData.organization} />
      <StructuredData data={structuredData.educationalApp} />
      <Home />
    </>
  );
}
