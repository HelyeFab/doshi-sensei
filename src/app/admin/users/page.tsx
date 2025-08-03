import type { Metadata } from 'next';
import UsersPage from './UsersPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = generatePageMetadata({
  title: 'Users',
  description: 'Users - Learn Japanese with Dōshi Sensei\'s comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice',
  path: '/admin/users',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Users",
      "url": "/users"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <UsersPage />
    </>
  );
}
