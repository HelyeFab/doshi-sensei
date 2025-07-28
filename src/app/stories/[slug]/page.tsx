import { Metadata } from 'next';
import StoryClient from './StoryClient';

export const metadata = {
  title: '[slug]',
  description: '[slug] - The ultimate Japanese learning platform: Master verb conjugations, study kanji through JLPT levels and mood boards, practice with Jisho/WaniKani vocabulary, import Anki decks, read news articles and AI stories, practice YouTube shadowing, play learning games, access grammar resources, and build fluency with our comprehensive suite of interactive tools.',
  openGraph: {
    title: '[slug] | Doshi Sensei',
    description: '[slug] - The ultimate Japanese learning platform: Master verb conjugations, study kanji through JLPT levels and mood boards, practice with Jisho/WaniKani vocabulary, import Anki decks, read news articles and AI stories, practice YouTube shadowing, play learning games, access grammar resources, and build fluency with our comprehensive suite of interactive tools.',
  },
};

export default function StoryPage(props: any) {
  return <StoryClient {...props} />;
}