import type { Metadata } from 'next';
import YouTubeShadowing from './YouTubeShadowing';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = generatePageMetadata({
  title: 'YouTube Shadowing - Japanese Pronunciation Practice',
  description: 'Practice Japanese shadowing with any YouTube video. Extract audio, get AI-generated transcripts, practice pronunciation, and improve listening skills with native content.',
  keywords: [
    "Japanese shadowing",
    "YouTube shadowing",
    "pronunciation practice",
    "listening practice",
    "Japanese audio",
    "speech practice",
    "native content"
  ],
  path: '/tools/youtube-shadowing',
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
      "name": "YouTube Shadowing",
      "url": "/tools/youtube-shadowing"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <YouTubeShadowing />
    </>
  );
}
