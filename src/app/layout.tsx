import type { Metadata } from "next";
import { Geist, Geist_Mono, Rubik, Dancing_Script } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserProfileProvider } from "@/contexts/UserProfileContext";
import { AdminProvider } from "@/contexts/AdminContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ClientThemeWrapper } from "@/components/ClientThemeWrapper";
import { ToastContainer } from "@/components/ui/Toast";
import { EnvProvider } from "@/components/EnvProvider";
import MobileMenu from "@/components/MobileMenu";
import DesktopNavMenu from "@/components/DesktopNavMenu";
import StunningBottomNavbar from "@/components/StunningBottomNavbar";
import PWAInstaller from "@/components/PWAInstaller";
import PWAUpdateNotification from "@/components/PWAUpdateNotification";
import FloatingDonateButton from "@/components/FloatingDonateButton";
import PWAWrapper from "@/components/PWAWrapper";
import { OnboardingWrapper } from "@/components/onboarding/OnboardingWrapper";
import CompanionTrigger from "@/components/CompanionTrigger";
import JMdictInitializer from "@/components/JMdictInitializer";
import OfflineNotification from "@/components/OfflineNotification";
import { ModalProvider } from "@/contexts/ModalContext";
import { KanjiSelectionProvider } from '@/contexts/KanjiSelectionContext';
import { CacheSystemInitializer } from '@/components/CacheSystemInitializer';
import { DevHelper } from '@/components/DevHelper';
import { AchievementToastManager } from '@/components/achievements/AchievementToast';
import { AchievementInitializer } from '@/components/achievements/AchievementInitializer';
import { NavigationGestures } from '@/components/navigation/NavigationGestures';
import { NavigationProvider } from '@/contexts/NavigationContext';
import { KanjiPreloadInitializer } from '@/components/KanjiPreloadInitializer';
import PWARecovery from '@/components/PWARecovery';
import StructuredData from '@/components/StructuredData';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const savoyeFont = Dancing_Script({
  variable: "--font-savoye",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const manrope = localFont({
  src: [
    {
      path: "../../public/fonts/Manrope/static/Manrope-ExtraLight.ttf",
      weight: "200",
    },
    {
      path: "../../public/fonts/Manrope/static/Manrope-Light.ttf",
      weight: "300",
    },
    {
      path: "../../public/fonts/Manrope/static/Manrope-Regular.ttf",
      weight: "400",
    },
    {
      path: "../../public/fonts/Manrope/static/Manrope-Medium.ttf",
      weight: "500",
    },
    {
      path: "../../public/fonts/Manrope/static/Manrope-SemiBold.ttf",
      weight: "600",
    },
    {
      path: "../../public/fonts/Manrope/static/Manrope-Bold.ttf",
      weight: "700",
    },
    {
      path: "../../public/fonts/Manrope/static/Manrope-ExtraBold.ttf",
      weight: "800",
    },
  ],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: {
    default: 'Doshi Sensei - The Ultimate Japanese Learning Platform',
    template: '%s | Doshi Sensei'
  },
  description: 'The ultimate Japanese learning platform: Master verb conjugations, study kanji through JLPT levels and mood boards, practice with Jisho/WaniKani vocabulary, import Anki decks, read news articles and AI stories, practice YouTube shadowing, play learning games, access grammar resources, and build fluency with our comprehensive suite of interactive tools.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' }
    ],
    apple: '/apple-icon.svg'
  },
  keywords: [
    'Japanese learning platform',
    'Japanese verb conjugation',
    'JLPT kanji study',
    'kanji mood boards',
    'Jisho vocabulary',
    'WaniKani integration',
    'Anki deck import',
    'Japanese flashcards',
    'YouTube shadowing practice',
    'Japanese news reading',
    'AI Japanese stories',
    'Japanese learning games',
    'Japanese grammar resources',
    'hiragana katakana practice',
    'spaced repetition Japanese',
    'comprehensive Japanese study',
    'Japanese language app',
    'learn Japanese online',
    'Japanese drill practice',
    'Japanese vocabulary builder',
    'ichidan verbs',
    'godan verbs',
    'Japanese practice',
    'JLPT preparation'
  ],
  authors: [{ name: 'Doshi Sensei Team' }],
  creator: 'Doshi Sensei',
  publisher: 'Doshi Sensei',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://doshisensei.com'),
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/en-US',
      'ja-JP': '/ja-JP',
    },
  },
  openGraph: {
    title: 'Doshi Sensei - The Ultimate Japanese Learning Platform',
    description: 'The ultimate Japanese learning platform: Master verb conjugations, study kanji through JLPT levels and mood boards, practice with Jisho/WaniKani vocabulary, import Anki decks, read news articles and AI stories, practice YouTube shadowing, play learning games, access grammar resources, and build fluency with our comprehensive suite of interactive tools.',
    url: 'https://doshisensei.com',
    siteName: 'Doshi Sensei',
    images: [
      {
        url: '/doshi.png',
        width: 1200,
        height: 630,
        alt: 'Doshi Sensei - The Ultimate Japanese Learning Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Doshi Sensei - The Ultimate Japanese Learning Platform',
    description: 'Master Japanese with comprehensive tools: verb conjugations, kanji study, vocabulary practice, YouTube shadowing, AI stories, and more!',
    images: ['/doshi.png'],
    creator: '@doshisensei',
    site: '@doshisensei',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
    // yahoo: 'your-yahoo-verification-code',
  },
  category: 'education',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#8a5cf6', // Match splash screen background color hsl(271, 81%, 56%)
};

// Structured data for the application
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "@id": "https://doshisensei.com/#application",
  "name": "Doshi Sensei",
  "url": "https://doshisensei.com",
  "description": "The ultimate Japanese learning platform: Master verb conjugations, study kanji through JLPT levels and mood boards, practice with Jisho/WaniKani vocabulary, import Anki decks, read news articles and AI stories, practice YouTube shadowing, play learning games, access grammar resources, and build fluency with our comprehensive suite of interactive tools.",
  "applicationCategory": "EducationalApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "1250"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Doshi Sensei",
    "url": "https://doshisensei.com"
  }
};

// Force clean rebuild: Sun Jun 29 2025 22:43:00
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* PWA Manifest and Meta Tags */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="application-name" content="Doshi Sensei" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Doshi Sensei" />
        <meta name="format-detection" content="telephone=no" />
        
        {/* Prevent browser-generated splash screens by providing our own */}
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* Apple devices splash screens - these prevent the default splash */}
        {/* iPhone SE */}
        <link 
          rel="apple-touch-startup-image" 
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" 
          href="/splash/splash-750x1334.png" 
        />
        {/* iPhone 12 Pro */}
        <link 
          rel="apple-touch-startup-image" 
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" 
          href="/splash/splash-1170x2532.png" 
        />
        {/* iPhone 14 Pro Max */}
        <link 
          rel="apple-touch-startup-image" 
          media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" 
          href="/splash/splash-1290x2796.png" 
        />
        {/* iPad */}
        <link 
          rel="apple-touch-startup-image" 
          media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)" 
          href="/splash/splash-1536x2048.png" 
        />
        {/* iPad Pro 12.9" */}
        <link 
          rel="apple-touch-startup-image" 
          media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)" 
          href="/splash/splash-2048x2732.png" 
        />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#6366f1" />
        <meta name="msapplication-tap-highlight" content="no" />

        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/doshi.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/doshi.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/doshi.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/doshi.png" />

        {/* Favicons */}
        <link rel="icon" type="image/png" sizes="32x32" href="/doshi.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/doshi.png" />
        <link rel="mask-icon" href="/doshi.png" color="#6366f1" />

        {/* Theme handled by ClientThemeWrapper to prevent hydration issues */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${rubik.variable} ${savoyeFont.variable} ${manrope.variable} antialiased min-h-screen`}
        suppressHydrationWarning
      >
        <EnvProvider>
          <KanjiSelectionProvider>
            <SettingsProvider>
              <LanguageProvider>
                <AuthProvider>
                  <UserProfileProvider>
                    <NotificationProvider>
                      <AdminProvider>
                        <ModalProvider>
                          <NavigationProvider>
                            {/* Use a client component to connect settings to theme */}
                            <ClientThemeWrapper>
                              <PWAWrapper>
                                <OnboardingWrapper>
                                  <AchievementToastManager>
                                    <div className="min-h-screen bg-background text-foreground">
                                      <StructuredData data={structuredData} />
                                      <OfflineNotification />
                                      <JMdictInitializer />
                                      <CacheSystemInitializer />
                                      <AchievementInitializer />
                                      <KanjiPreloadInitializer />
                                      <div className="mobile-nav-padding">
                                        {children}
                                      </div>
                                      <StunningBottomNavbar />
                                      <MobileMenu />
                                      <DesktopNavMenu />
                                      <PWAInstaller />
                                      <PWAUpdateNotification />
                                      <FloatingDonateButton />
                                      <CompanionTrigger />
                                      <ToastContainer />
                                      <NavigationGestures />
                                      <DevHelper />
                                      <PWARecovery />
                                    </div>
                                  </AchievementToastManager>
                                </OnboardingWrapper>
                              </PWAWrapper>
                            </ClientThemeWrapper>
                          </NavigationProvider>
                        </ModalProvider>
                      </AdminProvider>
                    </NotificationProvider>
                  </UserProfileProvider>
                </AuthProvider>
              </LanguageProvider>
            </SettingsProvider>
          </KanjiSelectionProvider>
        </EnvProvider>
      </body>
    </html>
  );
}

// No duplicate component needed as we're importing it from @/components/ClientThemeWrapper
