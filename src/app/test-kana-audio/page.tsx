import type { Metadata } from 'next';
import TestKanaAudio from './TestKanaAudio';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Test Kana Audio',
  description: 'Test Kana Audio - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/test-kana-audio',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Test Kana Audio",
      "url": "/test-kana-audio"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <TestKanaAudio />
    </>
  );
}
