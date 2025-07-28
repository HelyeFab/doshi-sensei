import { Metadata } from 'next';
import GamesClient from './GamesClient';

export const metadata: Metadata = {
  title: 'Japanese Learning Games',
  description: 'Play fun and interactive games to practice Japanese. Master kanji with memory games, practice stroke order, navigate reading challenges, and more. Learn Japanese through engaging gameplay.',
  keywords: [
    'Japanese learning games',
    'kanji games',
    'Japanese vocabulary games',
    'stroke order practice',
    'Japanese memory games',
    'reading practice games',
    'interactive Japanese learning',
    'gamified language learning',
    'Japanese educational games',
    'kanji simon',
    'reading routes game',
    'fun Japanese practice'
  ],
  openGraph: {
    title: 'Japanese Learning Games | Doshi Sensei',
    description: 'Play fun and interactive games to practice Japanese. Master kanji, vocabulary, and reading through engaging gameplay.',
    type: 'website',
  },
  alternates: {
    canonical: '/games',
  },
};

const gamesStructuredData = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Japanese Learning Games - Doshi Sensei",
  "description": "A collection of interactive games for practicing Japanese kanji, vocabulary, reading, and writing skills.",
  "url": "https://doshisensei.com/games",
  "isPartOf": {
    "@type": "WebApplication",
    "name": "Doshi Sensei"
  },
  "hasPart": [
    {
      "@type": "Game",
      "name": "Kanji Simon",
      "description": "Memory game for learning kanji",
      "gamePlatform": "Web",
      "learningResourceType": "Interactive Game"
    },
    {
      "@type": "Game",
      "name": "Reading Routes",
      "description": "Navigate through Japanese text",
      "gamePlatform": "Web",
      "learningResourceType": "Interactive Game"
    },
    {
      "@type": "Game",
      "name": "Stroke Order Practice",
      "description": "Learn correct kanji stroke order",
      "gamePlatform": "Web",
      "learningResourceType": "Interactive Game"
    }
  ]
};

export default function GamesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(gamesStructuredData),
        }}
      />
      <GamesClient />
    </>
  );
}