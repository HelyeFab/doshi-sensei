import { Metadata } from 'next';
import ArticlesManagementClient from './ArticlesManagementClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Articles | Doshi Sensei',
  description: 'Articles - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Articles | Doshi Sensei',
    description: 'Articles - Part of Doshi Sensei's comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/admin/articles',
  },
  twitter: {
    card: 'summary',
    title: 'Articles | Doshi Sensei',
    description: 'Articles - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Articles - Doshi Sensei",
  "description": "Articles - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/admin/articles",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function ArticlesManagementPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <ArticlesManagementClient />
    </>
  );
}