import type { Metadata } from 'next';
import YouTubeSeriesPage from './YouTubeSeriesPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = generatePageMetadata({
  title: 'YouTube Series - Curated Japanese Learning Channels',
  description: 'Discover curated Japanese YouTube channels with valuable learning content. Watch directly or practice with our advanced shadowing tool for pronunciation improvement.',
  keywords: [
    "Japanese YouTube channels",
    "curated Japanese content",
    "Japanese learning videos",
    "YouTube shadowing",
    "Japanese practice videos",
    "listening practice",
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