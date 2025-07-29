import type { Metadata } from 'next';
import SettingsPage from './SettingsPage';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: 'Settings',
  description: 'Manage your Dōshi Sensei settings, preferences, learning goals, and study options',
  path: '/settings',
});

export default function Page() {
  const breadcrumbData = structuredData.breadcrumb([
    {
      "name": "Home",
      "url": "/"
    },
    {
      "name": "Settings",
      "url": "/settings"
    }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <SettingsPage />
    </>
  );
}
