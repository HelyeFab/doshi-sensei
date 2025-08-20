import type { Metadata } from 'next';
import AccountPage from './AccountPage';

export const metadata: Metadata = {
  title: 'My Account - Dōshi Sensei',
  description: 'Manage your Dōshi Sensei account, subscription, study progress, and achievements',
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
};

const accountStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "My Account - Dōshi Sensei",
  "description": "Manage your Japanese learning account and subscription",
  "url": "https://doshisensei.com/account",
  "breadcrumb": {
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
        "name": "Account",
        "item": "https://doshisensei.com/account"
      }
    ]
  }
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(accountStructuredData),
        }}
      />
      <AccountPage />
    </>
  );
}