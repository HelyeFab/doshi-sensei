import { Metadata } from 'next';
import PrivacyPolicyClient from './PrivacyPolicyClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Privacy Policy | Doshi Sensei',
  description: 'Privacy Policy - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Privacy Policy | Doshi Sensei',
    description: 'Privacy Policy - Part of Doshi Sensei's comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/settings/privacy-policy',
  },
  twitter: {
    card: 'summary',
    title: 'Privacy Policy | Doshi Sensei',
    description: 'Privacy Policy - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Privacy Policy - Doshi Sensei",
  "description": "Privacy Policy - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/settings/privacy-policy",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <PrivacyPolicyClient />
    </>
  );
}