import { Metadata } from 'next';
import { LeaderboardPage } from './LeaderboardPage';

export const metadata: Metadata = {
  title: 'Leaderboard - Doshi Sensei',
  description: 'View the top learners on Doshi Sensei. See rankings based on total score and compete with other Japanese language learners.',
  keywords: ['leaderboard', 'rankings', 'top learners', 'Japanese learning', 'competition', 'scores'],
  openGraph: {
    title: 'Leaderboard - Doshi Sensei',
    description: 'View the top learners on Doshi Sensei. See rankings based on total score.',
    type: 'website',
    url: 'https://doshisensei.com/leaderboard',
    images: [
      {
        url: 'https://doshisensei.com/images/og-leaderboard.png',
        width: 1200,
        height: 630,
        alt: 'Doshi Sensei Leaderboard'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Leaderboard - Doshi Sensei',
    description: 'View the top learners on Doshi Sensei. See rankings based on total score.',
    images: ['https://doshisensei.com/images/og-leaderboard.png']
  }
};

export default function Page() {
  return <LeaderboardPage />;
}