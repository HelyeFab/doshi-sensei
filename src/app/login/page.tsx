import { Metadata } from 'next';
import LoginClient from './LoginClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Login | Doshi Sensei',
  description: 'Sign in to access your personalized Japanese learning experience with Doshi Sensei. Continue your journey to Japanese fluency.',
  keywords: [
    'Doshi Sensei login',
    'Japanese learning account',
    'sign in Japanese app',
    'Japanese study login'
  ],
  openGraph: {
    title: 'Login | Doshi Sensei',
    description: 'Sign in to access your personalized Japanese learning experience with Doshi Sensei.',
    type: 'website',
    url: 'https://doshisensei.com/login',
  },
  twitter: {
    card: 'summary',
    title: 'Login | Doshi Sensei',
    description: 'Sign in to continue your Japanese learning journey.',
  },
  robots: {
    index: false, // Don't index login pages
    follow: true,
  },
};

const loginStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Login - Doshi Sensei",
  "description": "Sign in to access your personalized Japanese learning experience",
  "url": "https://doshisensei.com/login",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function LoginPage() {
  return (
    <>
      <StructuredData data={loginStructuredData} />
      <LoginClient />
    </>
  );
}