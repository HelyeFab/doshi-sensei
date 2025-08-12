import type { Metadata } from 'next';
import YouTubeSeriesPage from './YouTubeSeriesPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = generatePageMetadata({
  title: 'YouTube Series - Curated Japanese Learning Content',
  description: 'Watch curated YouTube series selected for Japanese learning. Practice with shadowing or enjoy valuable content from trusted creators.',
  keywords: [
    "Japanese YouTube series",
    "curated Japanese content",
    "Japanese learning videos",
    "YouTube shadowing",
    "Japanese channels",
    "native Japanese content"
  ],
  path: '/tools/youtube-series',
  image: '/og-images/og-tools.png'
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Tools",
      "url": "/tools"
    },
    {
      "name": "YouTube Series",
      "url": "/tools/youtube-series"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <YouTubeSeriesPage />
    </>
  );
}