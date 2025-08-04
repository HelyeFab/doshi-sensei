import { Metadata } from 'next';

interface SEOPageConfig {
  title: string;
  description: string;
  keywords?: string[];
  path?: string;
  image?: string;
  type?: 'website' | 'article';
}

const siteConfig = {
  name: 'Dōshi Sensei',
  url: 'https://doshisensei.com',
  image: '/doshi.png',
  twitter: '@doshisensei',
};

export function generatePageMetadata(config: SEOPageConfig): Metadata {
  const {
    title,
    description,
    keywords = [],
    path = '',
    image = siteConfig.image,
    type = 'website',
  } = config;

  const url = `${siteConfig.url}${path}`;
  const fullTitle = title.includes('Sensei') ? title : `${title} | ${siteConfig.name}`;

  const metadata: Metadata = {
    title: fullTitle,
    description,
    keywords: keywords.length > 0 ? keywords : undefined,
    authors: [{ name: 'Doshi Sensei Team' }],
    creator: siteConfig.name,
    publisher: siteConfig.name,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: siteConfig.name,
      images: [
        {
          url: `${siteConfig.url}${image}`,
          width: 1200,
          height: 630,
          alt: `${siteConfig.name} - Japanese Learning App`,
        },
      ],
      locale: 'en_US',
      type,
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [`${siteConfig.url}${image}`],
      creator: siteConfig.twitter,
    },
    alternates: {
      canonical: url,
    },
  };

  return metadata;
}
