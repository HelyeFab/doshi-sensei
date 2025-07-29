import type { Metadata } from 'next';
import FavouritesPage from './FavouritesPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Favourites',
  description: 'Favourites - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/favourites',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Favourites",
      "url": "/favourites"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <FavouritesPage />
    </>
  );
}
