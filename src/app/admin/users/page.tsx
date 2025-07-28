import { Metadata } from 'next';
import UsersClient from './UsersClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Users | Doshi Sensei',
  description: 'Users - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Users | Doshi Sensei',
    description: 'Users - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/admin/users',
  },
  twitter: {
    card: 'summary',
    title: 'Users | Doshi Sensei',
    description: 'Users - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Users - Doshi Sensei",
  "description": "Users - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/admin/users",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function UsersPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <UsersClient />
    </>
  );
}