import { Metadata } from 'next';
import StoryClient from './pageClient';

export const metadata: Metadata = {
  title: 'Story',
  description: 'Read AI-generated Japanese stories tailored to your level. Interactive reading practice with engaging content.',
  openGraph: {
    title: 'Japanese Story | Doshi Sensei',
    description: 'Read AI-generated Japanese stories tailored to your level. Interactive reading practice with engaging content.',
  },
};

export default function StoryPage(props: any) {
  return <StoryClient {...props} />;
}