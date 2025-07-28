import { Metadata } from 'next';
import VerifyEmailClient from './VerifyEmailClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Verify Email | Doshi Sensei',
  description: 'Verify Email - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Verify Email | Doshi Sensei',
    description: 'Verify Email - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/verify-email',
  },
  twitter: {
    card: 'summary',
    title: 'Verify Email | Doshi Sensei',
    description: 'Verify Email - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Verify Email - Doshi Sensei",
  "description": "Verify Email - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/verify-email",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function VerifyEmailPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <VerifyEmailClient />
    </>
  );
}