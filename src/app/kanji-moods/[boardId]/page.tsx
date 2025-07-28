import { Metadata } from 'next';
import MoodBoardClient from './MoodBoardClient';

export const metadata = {
  title: '[boardId]',
  description: '[boardId] - The ultimate Japanese learning platform: Master verb conjugations, study kanji through JLPT levels and mood boards, practice with Jisho/WaniKani vocabulary, import Anki decks, read news articles and AI stories, practice YouTube shadowing, play learning games, access grammar resources, and build fluency with our comprehensive suite of interactive tools.',
  openGraph: {
    title: '[boardId] | Doshi Sensei',
    description: '[boardId] - The ultimate Japanese learning platform: Master verb conjugations, study kanji through JLPT levels and mood boards, practice with Jisho/WaniKani vocabulary, import Anki decks, read news articles and AI stories, practice YouTube shadowing, play learning games, access grammar resources, and build fluency with our comprehensive suite of interactive tools.',
  },
};

export default function MoodBoardPage(props: any) {
  return <MoodBoardClient {...props} />;
}