import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import ConjugationPage from './ConjugationPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

// Dynamically import debugger to avoid SSR issues
const ConjugationDebugger = dynamic(
  () => import('@/components/debug/ConjugationDebugger').then(mod => mod.ConjugationDebugger),
  { ssr: false }
);

export const metadata: Metadata = generatePageMetadata({
  title: 'Conjugation',
  description: 'Conjugation - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/practice/conjugation',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Conjugation",
      "url": "/conjugation"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <ConjugationPage />
      <ConjugationDebugger />
    </>
  );
}
