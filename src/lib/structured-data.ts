interface BreadcrumbItem {
  name: string;
  url: string;
}

export const structuredData = {
  website: {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Dōshi Sensei",
    "description": "The ultimate Japanese learning platform: Master verb conjugations, study kanji through JLPT levels and themed mood boards, complete vocabulary sets from Genki and Minna no Nihongo textbooks, practice with Jisho/WaniKani integration, import Anki decks, read NHK news with furigana, enjoy AI-generated stories, practice YouTube shadowing, play interactive learning games, and access comprehensive grammar resources.",
    "url": "https://doshisensei.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://doshisensei.com/vocabulary?search={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  },
  
  organization: {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Dōshi Sensei",
    "url": "https://doshisensei.com",
    "logo": "https://doshisensei.com/doshi.png",
    "sameAs": [
      "https://twitter.com/doshisensei"
    ]
  },

  educationalApp: {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Dōshi Sensei",
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "1250"
    }
  },

  breadcrumb: (items: BreadcrumbItem[]) => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": `https://doshisensei.com${item.url}`
    }))
  }),

  faqPage: (faqs: Array<{ question: string; answer: string }>) => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  }),

  article: (article: {
    title: string;
    description: string;
    publishedAt: string;
    modifiedAt?: string;
    author?: string;
    imageUrl?: string;
  }) => ({
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "description": article.description,
    "datePublished": article.publishedAt,
    "dateModified": article.modifiedAt || article.publishedAt,
    "author": {
      "@type": "Person",
      "name": article.author || "Dōshi Sensei Team"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Dōshi Sensei",
      "logo": {
        "@type": "ImageObject",
        "url": "https://doshisensei.com/doshi.png"
      }
    },
    "image": article.imageUrl || "https://doshisensei.com/doshi.png"
  })
};