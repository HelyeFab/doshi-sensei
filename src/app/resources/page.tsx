import { Metadata } from 'next';
import ResourcesClient from './ResourcesClient';

export const metadata: Metadata = {
  title: 'Japanese Learning Resources - Tools, Guides & Materials',
  description: 'Discover curated Japanese learning resources including study guides, learning tools, grammar explanations, and helpful materials for all JLPT levels.',
  keywords: [
    'Japanese learning resources',
    'Japanese study materials',
    'JLPT resources',
    'Japanese grammar guides',
    'learning tools',
    'study resources',
    'Japanese textbooks',
    'online Japanese resources',
    'Japanese learning tips',
    'study materials'
  ],
  openGraph: {
    title: 'Japanese Learning Resources | Doshi Sensei',
    description: 'Explore curated resources to enhance your Japanese learning journey.',
    type: 'website',
  },
  alternates: {
    canonical: '/resources',
  },
};

export default function ResourcesPage() {
  return <ResourcesClient />;
}