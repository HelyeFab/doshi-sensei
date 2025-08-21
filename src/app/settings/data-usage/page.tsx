import { Metadata } from 'next';
import DataUsageClient from './DataUsageClient';

export const metadata: Metadata = {
  title: 'Data Usage & Transparency | Doshi Sensei',
  description: 'Understand how Doshi Sensei collects, uses, and protects your data. Full transparency about our data practices.',
  openGraph: {
    title: 'Data Usage & Transparency | Doshi Sensei',
    description: 'Complete transparency about how we handle your data.',
  },
  robots: 'noindex, nofollow',
};

export default function DataUsagePage() {
  return <DataUsageClient />;
}