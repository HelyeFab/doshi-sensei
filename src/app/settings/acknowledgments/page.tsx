import { Metadata } from 'next';
import AcknowledgmentsClient from './AcknowledgmentsClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Acknowledgments | Doshi Sensei',
  description: 'Acknowledgments - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Acknowledgments | Doshi Sensei',
    description: 'Acknowledgments - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/settings/acknowledgments',
  },
  twitter: {
    card: 'summary',
    title: 'Acknowledgments | Doshi Sensei',
    description: 'Acknowledgments - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Acknowledgments - Doshi Sensei",
  "description": "Acknowledgments - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/settings/acknowledgments",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function AcknowledgmentsPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <AcknowledgmentsClient />
    </>
  );
}