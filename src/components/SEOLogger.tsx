'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface SEOLoggerProps {
  pageTitle?: string;
  pageDescription?: string;
  keywords?: string[];
  structuredData?: any;
}

export function SEOLogger({ 
  pageTitle, 
  pageDescription,
  keywords = [],
  structuredData
}: SEOLoggerProps) {
  const pathname = usePathname();
  
  useEffect(() => {
    // Extract metadata from the document
    const title = pageTitle || document.title;
    const description = pageDescription || 
      document.querySelector('meta[name="description"]')?.getAttribute('content') || 
      '(no description)';
    
    // Extract Open Graph data
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
    const ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content');
    const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
    const ogUrl = document.querySelector('meta[property="og:url"]')?.getAttribute('content');
    
    // Extract Twitter data
    const twitterTitle = document.querySelector('meta[name="twitter:title"]')?.getAttribute('content');
    const twitterDescription = document.querySelector('meta[name="twitter:description"]')?.getAttribute('content');
    const twitterImage = document.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
    
    // Extract canonical URL
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href');
    
    // Log SEO data to browser console
    console.log('%c🔍 SEO Metadata', 'color: #4CAF50; font-weight: bold; font-size: 16px');
    console.log('%cPage Information:', 'color: #2196F3; font-weight: bold');
    console.log({
      path: pathname,
      title,
      description,
      keywords: keywords.length > 0 ? keywords : '(none)',
      canonical
    });
    
    console.log('%cOpen Graph:', 'color: #FF9800; font-weight: bold');
    console.log({
      'og:title': ogTitle,
      'og:description': ogDescription,
      'og:image': ogImage,
      'og:url': ogUrl
    });
    
    console.log('%cTwitter Card:', 'color: #1DA1F2; font-weight: bold');
    console.log({
      'twitter:title': twitterTitle,
      'twitter:description': twitterDescription,
      'twitter:image': twitterImage
    });
    
    // Log structured data if present
    if (structuredData) {
      console.log('%cStructured Data:', 'color: #9C27B0; font-weight: bold');
      console.log(structuredData);
    }
    
    // Also log any JSON-LD scripts found on the page
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    if (jsonLdScripts.length > 0) {
      console.log('%cJSON-LD Structured Data Found:', 'color: #E91E63; font-weight: bold');
      jsonLdScripts.forEach((script, index) => {
        try {
          const data = JSON.parse(script.textContent || '{}');
          console.log(`Script ${index + 1}:`, data);
        } catch (e) {
          console.error(`Failed to parse JSON-LD script ${index + 1}:`, e);
        }
      });
    }
    
    // Log performance tip
    console.log('%c💡 SEO Tip:', 'color: #00BCD4; font-weight: bold', 
      'Check the Network tab to ensure all meta images are loading correctly!');
    
  }, [pathname, pageTitle, pageDescription, keywords, structuredData]);
  
  return null; // This component doesn't render anything
}