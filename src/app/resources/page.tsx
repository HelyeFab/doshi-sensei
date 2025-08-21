import type { Metadata } from 'next';
import ResourcesPage from './ResourcesPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

// Disable static generation for this page (uses Firebase)
export const dynamic = 'force-dynamic';

export const metadata: Metadata = generatePageMetadata({
  title: 'Japanese Learning Resources - Grammar & Study Guides',
  description: 'Access curated Japanese learning resources from top creators: comprehensive grammar guides, study tips, learning strategies, and expert recommendations for all levels.',
  keywords: [
    "Japanese resources",
    "grammar guides",
    "study resources",
    "learning tips",
    "Japanese creators",
    "study guides",
    "learning strategies"
  ],
  path: '/resources',
  image: '/og-images/og-resources.png'
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Resources",
      "url": "/resources"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <ResourcesPage />
    </>
  );
}