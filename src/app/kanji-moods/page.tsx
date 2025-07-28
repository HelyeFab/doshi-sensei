import { Metadata } from 'next';
import KanjiMoodsClient from './KanjiMoodsClient';

export const metadata: Metadata = {
  title: 'Kanji Mood Boards - Visual Kanji Learning by Theme',
  description: 'Learn Japanese kanji through beautifully curated mood boards organized by themes and JLPT levels. Master kanji with visual context and thematic connections.',
  keywords: [
    'kanji mood boards',
    'visual kanji learning',
    'thematic kanji',
    'JLPT kanji themes',
    'kanji by topic',
    'visual Japanese learning',
    'kanji collections',
    'themed kanji study',
    'kanji context learning',
    'Japanese character themes'
  ],
  openGraph: {
    title: 'Kanji Mood Boards | Doshi Sensei',
    description: 'Learn kanji through visual mood boards organized by themes. Master Japanese characters with context.',
    type: 'website',
  },
  alternates: {
    canonical: '/kanji-moods',
  },
};

export default function KanjiMoodsPage() {
  return <KanjiMoodsClient />;
}