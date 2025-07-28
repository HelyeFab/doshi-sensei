import { Metadata } from 'next';
import FavouritesClient from './FavouritesClient';

export const metadata: Metadata = {
  title: 'My Study Collections - Saved Words, Articles & Stories',
  description: 'Access your personalized Japanese study collections including vocabulary lists, bookmarked articles, saved stories, and Anki card imports for efficient learning.',
  keywords: [
    'Japanese vocabulary lists',
    'saved Japanese words',
    'study collections',
    'bookmarked articles',
    'saved stories',
    'personal word lists',
    'Anki card import',
    'custom study lists',
    'Japanese learning collections',
    'vocabulary management'
  ],
  openGraph: {
    title: 'My Study Collections | Doshi Sensei',
    description: 'Organize your Japanese learning with personalized vocabulary lists and saved content.',
    type: 'website',
  },
  robots: {
    index: false, // Personal collections shouldn't be indexed
    follow: false,
  },
  alternates: {
    canonical: '/favourites',
  },
};

export default function FavouritesPage() {
  return <FavouritesClient />;
}