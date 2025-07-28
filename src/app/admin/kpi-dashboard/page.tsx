import { Metadata } from 'next';
import KPIDashboardClient from './KPIDashboardClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'KPI Dashboard | Doshi Sensei',
  description: 'KPI Dashboard - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  openGraph: {
    title: 'KPI Dashboard | Doshi Sensei',
    description: 'KPI Dashboard - Part of Doshi Sensei's comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/admin/kpi-dashboard',
  },
  twitter: {
    card: 'summary',
    title: 'KPI Dashboard | Doshi Sensei',
    description: 'KPI Dashboard - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "KPI Dashboard - Doshi Sensei",
  "description": "KPI Dashboard - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/admin/kpi-dashboard",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function KPIDashboardPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <KPIDashboardClient />
    </>
  );
}