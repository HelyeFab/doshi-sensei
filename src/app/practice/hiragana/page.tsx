import { Metadata } from 'next';
import HiraganaClient from './HiraganaClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Hiragana | Doshi Sensei',
  description: 'Master hiragana characters with interactive practice exercises and mnemonics.',
  openGraph: {
    title: 'Hiragana | Doshi Sensei',
    description: 'Master hiragana characters with interactive practice exercises and mnemonics.',
    type: 'website',
    url: 'https://doshisensei.com/practice/hiragana',
  },
  twitter: {
    card: 'summary',
    title: 'Hiragana | Doshi Sensei',
    description: 'Master hiragana characters with interactive practice exercises and mnemonics.',
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Hiragana - Doshi Sensei",
  "description": "Master hiragana characters with interactive practice exercises and mnemonics.",
  "url": "https://doshisensei.com/practice/hiragana",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function HiraganaPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <HiraganaClient />
    </>
  );
}