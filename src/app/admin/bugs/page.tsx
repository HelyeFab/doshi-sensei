import { Metadata } from 'next';
import BugsClient from './BugsClient';

export const metadata: Metadata = {
  title: 'Admin - Bug Reports | Doshi Sensei',
  description: 'Manage bug reports and user feedback for Doshi Sensei.',
  robots: 'noindex, nofollow',
};

export default function BugsPage() {
  return <BugsClient />;
}