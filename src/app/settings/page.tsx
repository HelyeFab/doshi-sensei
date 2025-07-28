import { Metadata } from 'next';
import SettingsClient from './SettingsClient';

export const metadata: Metadata = {
  title: 'Settings - Customize Your Japanese Learning Experience',
  description: 'Configure your Doshi Sensei app settings including theme, language, navigation, study preferences, and data synchronization options.',
  keywords: [
    'Japanese learning settings',
    'app customization',
    'theme settings',
    'language preferences',
    'navigation configuration',
    'study settings',
    'data sync',
    'cache management',
    'daily goals',
    'app preferences'
  ],
  openGraph: {
    title: 'Settings | Doshi Sensei',
    description: 'Customize your Japanese learning experience with personalized settings and preferences.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Settings | Doshi Sensei',
    description: 'Customize your Japanese learning experience with personalized settings and preferences.',
  },
  robots: {
    index: false, // Settings pages shouldn't be indexed
    follow: false,
  },
  alternates: {
    canonical: '/settings',
  },
};

export default function SettingsPage() {
  return <SettingsClient />;
}