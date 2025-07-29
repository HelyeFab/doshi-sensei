import { Metadata } from 'next';
import MoodBoardClient from './pageClient';

export const metadata: Metadata = {
  title: 'Kanji Mood Board',
  description: 'Study kanji organized by themes and moods. Visual learning with curated kanji collections.',
  openGraph: {
    title: 'Kanji Mood Board | Doshi Sensei',
    description: 'Study kanji organized by themes and moods. Visual learning with curated kanji collections.',
  },
};

export default function MoodBoardPage(props: any) {
  return <MoodBoardClient {...props} />;
}