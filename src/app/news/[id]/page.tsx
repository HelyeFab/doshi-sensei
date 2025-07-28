import { Metadata } from 'next';
import ArticleClient from './ArticleClient';

export const metadata = {
  title: '[id]',
  description: '[id] - The ultimate Japanese learning platform: Master verb conjugations, study kanji through JLPT levels and mood boards, practice with Jisho/WaniKani vocabulary, import Anki decks, read news articles and AI stories, practice YouTube shadowing, play learning games, access grammar resources, and build fluency with our comprehensive suite of interactive tools.',
  openGraph: {
    title: '[id] | Doshi Sensei',
    description: '[id] - The ultimate Japanese learning platform: Master verb conjugations, study kanji through JLPT levels and mood boards, practice with Jisho/WaniKani vocabulary, import Anki decks, read news articles and AI stories, practice YouTube shadowing, play learning games, access grammar resources, and build fluency with our comprehensive suite of interactive tools.',
  },
};

export default function ArticlePage(props: any) {
  return <ArticleClient {...props} />;
}