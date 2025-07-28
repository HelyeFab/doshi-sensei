import { Metadata } from 'next';
import AuthActionClient from './AuthActionClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Action | Doshi Sensei',
  description: 'Action - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Action | Doshi Sensei',
    description: 'Action - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/auth/action',
  },
  twitter: {
    card: 'summary',
    title: 'Action | Doshi Sensei',
    description: 'Action - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Action - Doshi Sensei",
  "description": "Action - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/auth/action",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function AuthActionPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <AuthActionClient />
    </>
  );
}