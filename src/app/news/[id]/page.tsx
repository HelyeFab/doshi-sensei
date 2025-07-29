import { Metadata } from 'next';
import ArticleClient from './pageClient';

export const metadata: Metadata = {
  title: 'Article',
  description: 'Read Japanese news articles with interactive features. Practice reading comprehension with real news content.',
  openGraph: {
    title: 'Japanese News Article | Doshi Sensei',
    description: 'Read Japanese news articles with interactive features. Practice reading comprehension with real news content.',
  },
};

export default function ArticlePage(props: any) {
  return <ArticleClient {...props} />;
}