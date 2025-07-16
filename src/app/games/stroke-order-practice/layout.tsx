import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stroke Order Practice | Doshi Sensei',
  description: 'Learn to write kanji with proper stroke order through interactive practice',
};

export default function StrokeOrderPracticeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}