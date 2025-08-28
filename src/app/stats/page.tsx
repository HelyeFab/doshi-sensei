import type { Metadata } from 'next';
import StatsPage from './StatsPage';
import { generatePageMetadata } from '@/utils/seo';

export const metadata: Metadata = generatePageMetadata({
  title: 'Learning Stats & Progress - Doshi Sensei',
  description: 'Track your Japanese learning progress with detailed statistics, achievements, and personalized insights.',
  keywords: [
    "learning statistics",
    "progress tracking",
    "Japanese study stats",
    "achievement badges",
    "learning analytics",
    "study progress",
    "reading statistics"
  ],
  path: '/stats'
});

export default function Page() {
  return <StatsPage />;
}