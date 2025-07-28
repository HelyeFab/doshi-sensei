import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/test-*',
          '/_next/',
          '/static/',
          '/auth/action',
          '/verify-email',
          '/reset-password',
        ],
      },
    ],
    sitemap: 'https://doshisensei.com/sitemap.xml',
  };
}