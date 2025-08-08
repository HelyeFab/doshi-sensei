import { Metadata } from 'next';
import HelpFAQClient from './HelpFAQClient';

export const metadata: Metadata = {
  title: 'Help & FAQ | Dōshi Sensei',
  description: 'Find answers to frequently asked questions about Dōshi Sensei, the comprehensive Japanese language learning platform.',
  openGraph: {
    title: 'Help & FAQ | Dōshi Sensei',
    description: 'Get help and find answers to common questions about learning Japanese with Dōshi Sensei.',
  },
  robots: 'index, follow',
};

export default function HelpFAQPage() {
  return <HelpFAQClient />;
}