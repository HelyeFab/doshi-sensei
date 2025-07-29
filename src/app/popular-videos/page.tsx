import type { Metadata } from 'next';
import PopularVideos from './PopularVideos';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Popular Videos',
  description: 'Popular Videos - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/popular-videos',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Popular Videos",
      "url": "/popular-videos"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <PopularVideos />
    </>
  );
}
