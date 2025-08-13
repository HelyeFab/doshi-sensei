import type { Metadata } from 'next';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';
import SettingsWrapper from './SettingsWrapper';

export const metadata: Metadata = {
  ...generatePageMetadata({
    title: 'Settings',
    description: 'Manage your Dōshi Sensei settings, preferences, learning goals, and study options',
    path: '/settings',
  }),
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
};

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
      <SettingsWrapper />
    </>
  );
}