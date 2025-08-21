import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'YouTube Shadowing Practice - Doshi Sensei',
  description: 'Practice Japanese shadowing with YouTube videos. Extract audio, get transcripts, and improve your pronunciation.',
  keywords: 'Japanese shadowing, YouTube practice, pronunciation, listening practice, Japanese learning',
  openGraph: {
    title: 'YouTube Shadowing Practice - Doshi Sensei',
    description: 'Practice Japanese shadowing with YouTube videos. Extract audio, get transcripts, and improve your pronunciation.',
    url: 'https://doshisensei.com/tools/youtube-shadowing',
    siteName: 'Doshi Sensei',
    type: 'website',
  },
};

export default function YouTubeShadowingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}