import { Metadata } from 'next';
import TextbookVocabularyClient from './TextbookVocabularyClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Textbook Vocabulary | Doshi Sensei',
  description: 'Study vocabulary from popular Japanese textbooks including Genki and Minna no Nihongo with spaced repetition.',
  openGraph: {
    title: 'Textbook Vocabulary | Doshi Sensei',
    description: 'Study vocabulary from popular Japanese textbooks including Genki and Minna no Nihongo with spaced repetition.',
    type: 'website',
    url: 'https://doshisensei.com/tools/textbook-vocabulary',
  },
  twitter: {
    card: 'summary',
    title: 'Textbook Vocabulary | Doshi Sensei',
    description: 'Study vocabulary from popular Japanese textbooks including Genki and Minna no Nihongo with spaced repetition.',
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Textbook Vocabulary - Doshi Sensei",
  "description": "Study vocabulary from popular Japanese textbooks including Genki and Minna no Nihongo with spaced repetition.",
  "url": "https://doshisensei.com/tools/textbook-vocabulary",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function TextbookVocabularyPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <TextbookVocabularyClient />
    </>
  );
}