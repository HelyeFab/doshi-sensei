import { Metadata } from 'next';
import TermsOfServiceClient from './TermsOfServiceClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Terms of Service | Doshi Sensei',
  description: 'Terms of Service - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Terms of Service | Doshi Sensei',
    description: 'Terms of Service - Part of Doshi Sensei's comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/settings/terms-of-service',
  },
  twitter: {
    card: 'summary',
    title: 'Terms of Service | Doshi Sensei',
    description: 'Terms of Service - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Terms of Service - Doshi Sensei",
  "description": "Terms of Service - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/settings/terms-of-service",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function TermsOfServicePage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <TermsOfServiceClient />
    </>
  );
}