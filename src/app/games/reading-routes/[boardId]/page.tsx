import { Metadata } from 'next';
import ReadingRoutesGameClient from './pageClient';

export const metadata: Metadata = {
  title: 'Reading Routes Game',
  description: 'Navigate through Japanese sentences in this path-finding reading game. Practice reading comprehension and sentence structure.',
  openGraph: {
    title: 'Reading Routes Game | Doshi Sensei',
    description: 'Navigate through Japanese sentences in this path-finding reading game. Practice reading comprehension and sentence structure.',
  },
};

export default function ReadingRoutesGamePage(props: any) {
  return <ReadingRoutesGameClient {...props} />;
}