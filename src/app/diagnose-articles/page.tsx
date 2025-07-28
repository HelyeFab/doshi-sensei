import { Metadata } from 'next';
import DiagnoseArticlesClient from './DiagnoseArticlesClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Diagnose Articles | Doshi Sensei',
  description: 'Diagnose Articles - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Diagnose Articles | Doshi Sensei',
    description: 'Diagnose Articles - Part of Doshi Sensei's comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/diagnose-articles',
  },
  twitter: {
    card: 'summary',
    title: 'Diagnose Articles | Doshi Sensei',
    description: 'Diagnose Articles - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Diagnose Articles - Doshi Sensei",
  "description": "Diagnose Articles - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/diagnose-articles",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function DiagnoseArticlesPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <DiagnoseArticlesClient />
    </>
  );
}