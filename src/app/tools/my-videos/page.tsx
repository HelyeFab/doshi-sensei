import type { Metadata } from 'next';
import MyVideos from './MyVideos';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = generatePageMetadata({
  title: 'My Videos - Personal YouTube Practice History',
  description: 'Access your saved YouTube videos and practice history for Japanese shadowing exercises. Track your progress and quickly return to videos you\'ve practiced.',
  keywords: [
    "my practice videos",
    "YouTube practice history",
    "Japanese shadowing history",
    "saved videos",
    "practice progress",
    "video bookmarks",
    "learning history"
  ],
  path: '/tools/my-videos',
  image: '/og-images/og-tools.png'
});

export default function MyVideosPage() {
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
      "name": "My Videos",
      "url": "/tools/my-videos"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <MyVideos />
    </>
  );
}