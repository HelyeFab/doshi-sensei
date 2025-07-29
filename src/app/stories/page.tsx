import type { Metadata } from 'next';
import StoriesPage from './StoriesPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Japanese Stories - AI Generated & Graded Readers',
  description: 'Read engaging Japanese stories tailored to your level. Features AI-generated stories, classic tales, and graded readers with furigana support, vocabulary help, and comprehension exercises.',
  keywords: [
    "Japanese stories",
    "AI stories",
    "graded readers",
    "Japanese tales",
    "reading practice",
    "Japanese literature",
    "story comprehension"
  ],
  path: '/stories',
  image: '/og-images/og-stories.png'
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Stories",
      "url": "/stories"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <StoriesPage />
    </>
  );
}
