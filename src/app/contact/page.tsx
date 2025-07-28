import { Metadata } from 'next';
import ContactClient from './ContactClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Contact | Doshi Sensei',
  description: 'Contact - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Contact | Doshi Sensei',
    description: 'Contact - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/contact',
  },
  twitter: {
    card: 'summary',
    title: 'Contact | Doshi Sensei',
    description: 'Contact - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Contact - Doshi Sensei",
  "description": "Contact - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/contact",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function ContactPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <ContactClient />
    </>
  );
}