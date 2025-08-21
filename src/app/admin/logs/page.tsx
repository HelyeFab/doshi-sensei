import type { Metadata } from 'next';
import AdminLogsPage from './AdminLogsPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = generatePageMetadata({
  title: 'Logs',
  description: 'Logs - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/admin/logs',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Logs",
      "url": "/logs"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <AdminLogsPage />
    </>
  );
}
