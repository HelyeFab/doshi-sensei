import { Metadata } from 'next';
import ResetPasswordClient from './ResetPasswordClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Reset Password | Doshi Sensei',
  description: 'Reset Password - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Reset Password | Doshi Sensei',
    description: 'Reset Password - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/reset-password',
  },
  twitter: {
    card: 'summary',
    title: 'Reset Password | Doshi Sensei',
    description: 'Reset Password - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Reset Password - Doshi Sensei",
  "description": "Reset Password - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/reset-password",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function ResetPasswordPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <ResetPasswordClient />
    </>
  );
}