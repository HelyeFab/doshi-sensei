import type { Metadata } from 'next';
import ReviewHubClient from './ReviewHubClient';
import { generatePageMetadata } from '@/utils/seo';

export const metadata: Metadata = {
  ...generatePageMetadata({
    title: 'Review Hub - Unified Learning System',
    description: 'Unified review system with intelligent spaced repetition. Review all your Japanese learning content in one place.',
    path: '/review-hub',
    keywords: 'Japanese review, unified learning, spaced repetition, FSRS, kanji review, vocabulary review'
  }),
};

export default function ReviewHubPage() {
  return <ReviewHubClient />;
}