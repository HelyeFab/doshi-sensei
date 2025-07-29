export function generateStructuredData(config: any) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": config.siteName,
    "description": config.siteDescription,
    "url": config.siteUrl,
    "sameAs": ["https://twitter.com/@doshisensei"],
  };
}