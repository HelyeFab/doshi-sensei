import { Metadata } from 'next';
import EditMoodBoardClient from './pageClient';

export const metadata: Metadata = {
  title: 'Edit Mood Board',
  description: 'Edit kanji mood board settings and content.',
  openGraph: {
    title: 'Edit Mood Board | Doshi Sensei Admin',
    description: 'Edit kanji mood board settings and content.',
  },
};

export default function EditMoodBoardPage(props: any) {
  return <EditMoodBoardClient {...props} />;
}