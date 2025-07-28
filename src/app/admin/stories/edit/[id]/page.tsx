import { Metadata } from 'next';
import EditStoryClient from './EditStoryClient';

export const metadata: Metadata = {
  title: 'Edit Story',
  description: 'Edit Story - The ultimate Japanese learning platform: Master verb conjugations, study kanji through JLPT levels and mood boards, practice with Jisho/WaniKani vocabulary, import Anki decks, read news articles and AI stories, practice YouTube shadowing, play learning games, access grammar resources, and build fluency with our comprehensive suite of interactive tools.',
  openGraph: {
    title: 'Edit Story | Doshi Sensei',
    description: 'Edit Story - The ultimate Japanese learning platform: Master verb conjugations, study kanji through JLPT levels and mood boards, practice with Jisho/WaniKani vocabulary, import Anki decks, read news articles and AI stories, practice YouTube shadowing, play learning games, access grammar resources, and build fluency with our comprehensive suite of interactive tools.',
  },
};

export default function EditStoryPage(props: any) {
  return <EditStoryClient {...props} />;
}