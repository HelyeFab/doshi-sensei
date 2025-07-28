import { Metadata } from 'next';
import EditResourceClient from './EditResourceClient';

export const metadata = {
  title: 'Edit',
  description: 'Edit - The ultimate Japanese learning platform: Master verb conjugations, study kanji through JLPT levels and mood boards, practice with Jisho/WaniKani vocabulary, import Anki decks, read news articles and AI stories, practice YouTube shadowing, play learning games, access grammar resources, and build fluency with our comprehensive suite of interactive tools.',
  openGraph: {
    title: 'Edit | Doshi Sensei',
    description: 'Edit - The ultimate Japanese learning platform: Master verb conjugations, study kanji through JLPT levels and mood boards, practice with Jisho/WaniKani vocabulary, import Anki decks, read news articles and AI stories, practice YouTube shadowing, play learning games, access grammar resources, and build fluency with our comprehensive suite of interactive tools.',
  },
};

export default function EditResourcePage(props: any) {
  return <EditResourceClient {...props} />;
}