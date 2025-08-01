import { Metadata } from 'next';
import { FriendsPage } from './FriendsPage';

export const metadata: Metadata = {
  title: 'Friends - Doshi Sensei',
  description: 'Connect with other Japanese learners, send friend requests, and challenge each other.',
  keywords: ['friends', 'social', 'connect', 'Japanese learning', 'community', 'challenges'],
  openGraph: {
    title: 'Friends - Doshi Sensei',
    description: 'Connect with other Japanese learners and challenge each other.',
    type: 'website',
    url: 'https://doshisensei.com/friends',
    images: [
      {
        url: 'https://doshisensei.com/images/og-friends.png',
        width: 1200,
        height: 630,
        alt: 'Doshi Sensei Friends'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Friends - Doshi Sensei',
    description: 'Connect with other Japanese learners and challenge each other.',
    images: ['https://doshisensei.com/images/og-friends.png']
  }
};

export default function Page() {
  return <FriendsPage />;
}