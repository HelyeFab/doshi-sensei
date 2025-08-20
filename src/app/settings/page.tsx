import type { Metadata } from 'next';
import SettingsClient from './SettingsClient';

// SEO Metadata
export const metadata: Metadata = {
  title: 'Settings - Dōshi Sensei',
  description: 'Manage your Dōshi Sensei settings, preferences, learning goals, and study options',
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
};

// Structured Data for breadcrumbs
const breadcrumbData = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://doshisensei.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Settings",
      "item": "https://doshisensei.com/settings"
    }
  ]
};

export default function SettingsPage() {
  return (
    <>
      {/* SEO Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbData),
        }}
      />
      <SettingsClient />
    </>
  );
}