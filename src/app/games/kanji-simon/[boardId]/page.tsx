import { Metadata } from 'next';
import KanjiSimonGameClient from './pageClient';

export const metadata: Metadata = {
  title: 'Kanji Simon Game',
  description: 'Test your memory with the Kanji Simon memory game. Practice kanji recognition and memory skills in this fun interactive game.',
  openGraph: {
    title: 'Kanji Simon Game | Doshi Sensei',
    description: 'Test your memory with the Kanji Simon memory game. Practice kanji recognition and memory skills in this fun interactive game.',
  },
};

export default function KanjiSimonGamePage(props: any) {
  return <KanjiSimonGameClient {...props} />;
}