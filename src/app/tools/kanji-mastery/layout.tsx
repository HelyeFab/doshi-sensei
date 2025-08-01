import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kanji Mastery - Doshi Sensei',
  description: 'Master kanji with spaced repetition and comprehensive learning tools',
  keywords: 'kanji, learning, spaced repetition, JLPT, Japanese',
  openGraph: {
    title: 'Kanji Mastery - Doshi Sensei',
    description: 'Master kanji with spaced repetition and comprehensive learning tools',
    type: 'website',
  },
};

export default function KanjiMasteryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}