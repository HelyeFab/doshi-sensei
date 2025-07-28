export const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Doshi Sensei",
    "description": "The ultimate Japanese learning platform: Master verb conjugations, study kanji through JLPT levels and mood boards, practice with Jisho/WaniKani vocabulary, import Anki decks, read news articles and AI stories, practice YouTube shadowing, play learning games, access grammar resources, and build fluency with our comprehensive suite of interactive tools.",
    "url": "https://doshisensei.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://doshisensei.com/search?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Doshi Sensei",
    "description": "The ultimate Japanese learning platform: Master verb conjugations, study kanji through JLPT levels and mood boards, practice with Jisho/WaniKani vocabulary, import Anki decks, read news articles and AI stories, practice YouTube shadowing, play learning games, access grammar resources, and build fluency with our comprehensive suite of interactive tools.",
    "url": "https://doshisensei.com",
    "sameAs": [
      "@doshisensei"
    ]
  }
];

export function getStructuredDataScript() {
  return {
    __html: JSON.stringify(structuredData),
  };
}