import type { Metadata } from 'next';
import ReadPage from './ReadPage';
import { generatePageMetadata } from '@/utils/seo';

export const metadata: Metadata = generatePageMetadata({
  title: 'Read Japanese - News, Stories & Articles',
  description: 'Improve your Japanese reading skills with news articles, stories, and graded readers. Features furigana support, vocabulary help, and comprehension exercises.',
  keywords: [
    "Japanese reading",
    "NHK news",
    "Japanese stories",
    "graded readers",
    "reading practice",
    "Japanese articles",
    "comprehension exercises"
  ],
  path: '/read'
});

export default function Page() {
  return <ReadPage />;
}