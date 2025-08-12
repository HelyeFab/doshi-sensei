import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { CombinedAuthProvider } from "@/contexts/CombinedAuthProvider";
import { CombinedUIProvider } from "@/contexts/CombinedUIProvider";
import { CombinedFeatureProvider } from "@/contexts/CombinedFeatureProvider";
import { NotificationServiceProvider } from "@/contexts/NotificationServiceContext";
import { ToastProvider } from "@/components/ui/Toast";
import { EnhancedToastProvider } from "@/components/ui/EnhancedToast";
import { UnifiedNotificationProvider } from "@/components/UnifiedNotificationProvider";
import { PWAErrorBoundary } from "@/components/PWAErrorBoundary";
import { IOSInstallGuide } from "@/components/IOSInstallGuide";
import { EnvProvider } from "@/components/EnvProvider";
import MobileMenu from "@/components/MobileMenu";
import DesktopNavMenu from "@/components/DesktopNavMenu";
import StunningBottomNavbar from "@/components/StunningBottomNavbar";
// Removed: PWAInstaller and PWAUpdateNotification - now handled by UnifiedNotificationProvider
import FloatingDonateButton from "@/components/FloatingDonateButton";
import PWAWrapper from "@/components/PWAWrapper";
import { OnboardingWrapper } from "@/components/onboarding/OnboardingWrapper";
import CompanionTrigger from "@/components/CompanionTrigger";
// Removed: OfflineNotification and NetworkStatus - now handled by UnifiedNotificationProvider
import { VirtualCompanionProvider } from "@/contexts/VirtualCompanionContext";
import GlobalVirtualCompanion from "@/components/GlobalVirtualCompanion";
import { DevHelper } from '@/components/DevHelper';
import { AchievementToastManager } from '@/components/achievements/AchievementToast';
import PWARecovery from '@/components/PWARecovery';
import { LazyInitializers } from '@/components/LazyInitializers';
import { FastRefreshLogger } from '@/components/FastRefreshLogger';
import { NavigationErrorBoundary } from './NavigationErrorBoundary';
import { PersistentLogger } from '@/components/PersistentLogger';
import { PrewarmingScript } from '@/components/PrewarmingScript';
import { QuickContextProvider } from '@/components/QuickContext';
import NextAuthProvider from '@/components/providers/NextAuthProvider';

// Optimized font loading - only load essential weights initially
const geistSans = localFont({
  src: "../../public/fonts/Geist/Geist-VariableFont_wght.ttf",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: 'swap',
  preload: true,
});

const geistMono = localFont({
  src: "../../public/fonts/Geist_Mono/GeistMono-VariableFont_wght.ttf",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: 'swap',
  preload: false, // Only preload if used on homepage
});

// Only load the weights actually used on homepage
const rubik = localFont({
  src: [
    {
      path: "../../public/fonts/Rubik/static/Rubik-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/Rubik/static/Rubik-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/Rubik/static/Rubik-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/Rubik/static/Rubik-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-rubik",
  display: 'swap',
  preload: true,
});

// Decorative font - only load regular weight initially
const savoyeFont = localFont({
  src: "../../public/fonts/Dancing_Script/static/DancingScript-Regular.ttf",
  weight: "400",
  variable: "--font-savoye",
  display: 'swap',
  preload: false, // Don't preload decorative fonts
});

// Only load commonly used weights for Manrope
const manrope = localFont({
  src: [
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
  ],
  variable: "--font-manrope",
  display: 'swap',
  preload: false, // Only preload if heavily used
});

export const metadata: Metadata = {
  title: {
    default: 'Dōshi Sensei - Master Japanese Verb Conjugations',
    template: '%s | Dōshi Sensei'
  },
  description: 'The ultimate Japanese learning platform: Master verb conjugations, study kanji through JLPT levels and themed mood boards, complete vocabulary sets from Genki I & II and Minna no Nihongo I & II textbooks, practice with Jisho/WaniKani integration, import Anki decks, read NHK news with furigana, enjoy AI-generated stories, practice YouTube shadowing, play interactive learning games, access comprehensive grammar resources from Japanese creators, and build fluency with our all-in-one toolkit.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' }
    ],
    apple: '/apple-icon.svg'
  },
  keywords: [
    'Japanese learning',
    'Japanese verbs',
    'verb conjugation',
    'Japanese grammar',
    'ichidan verbs',
    'godan verbs',
    'Japanese practice',
    'JLPT preparation',
    'Japanese study',
    'learn Japanese online',
    'Japanese app',
    'conjugation practice',
    'Japanese vocabulary',
    'Japanese education',
    'language learning'
  ],
  authors: [{ name: 'Dōshi Sensei Team' }],
  creator: 'Dōshi Sensei',
  publisher: 'Dōshi Sensei',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://doshisensei.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Dōshi Sensei - Master Japanese Verb Conjugations',
    description: 'Learn Japanese verb and adjective conjugations with interactive practice, drills, and vocabulary. Master ichidan, godan, and irregular verbs.',
    url: 'https://doshisensei.com',
    siteName: 'Dōshi Sensei',
    images: [
      {
        url: '/doshi.png',
        width: 1200,
        height: 630,
        alt: 'Dōshi Sensei - Japanese Learning App',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dōshi Sensei - Master Japanese Verb Conjugations',
    description: 'Learn Japanese verb and adjective conjugations with interactive practice, drills, and vocabulary.',
    images: ['/doshi.png'],
    creator: '@doshisensei',
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
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // Changed from 1 to allow zoom for accessibility
  minimumScale: 1,
  userScalable: true, // Changed to true for accessibility
  viewportFit: 'cover',
  themeColor: '#8a5cf6', // Match splash screen background color hsl(271, 81%, 56%)
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
        <meta name="application-name" content="Dōshi Sensei" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Dōshi Sensei" />
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
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/apple-touch-icon-120x120.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/apple-touch-icon-167x167.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180x180.png" />

        {/* Favicons */}
        <link rel="icon" type="image/png" sizes="32x32" href="/doshi.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/doshi.png" />
        <link rel="mask-icon" href="/doshi.png" color="#6366f1" />

        {/* RSS Feeds */}
        <link rel="alternate" type="application/rss+xml" title="Dōshi Sensei - Japanese News" href="/api/rss/news" />
        <link rel="alternate" type="application/rss+xml" title="Dōshi Sensei - Japanese Stories" href="/api/rss/stories" />

        
        {/* PWA Manager - Intelligent Service Worker Management */}
        <script src="/pwa-manager.js" />
        
        {/* PWA Service Worker Update Manager */}

        {/* Theme handled by ClientThemeWrapper to prevent hydration issues */}
        
        {/* Prewarming Script - Runs immediately before React hydration */}
        <PrewarmingScript />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${rubik.variable} ${savoyeFont.variable} ${manrope.variable} antialiased min-h-screen`}
        suppressHydrationWarning
      >
        <EnvProvider>
          <NextAuthProvider>
            <CombinedUIProvider>
              <CombinedAuthProvider>
                <CombinedFeatureProvider>
                  <NotificationServiceProvider>
                    <VirtualCompanionProvider>
                    <PWAWrapper>
                      <OnboardingWrapper>
                        <AchievementToastManager>
                          <QuickContextProvider>
                            <ToastProvider>
                              <EnhancedToastProvider>
                                <div className="min-h-screen bg-background text-foreground">
                                <FastRefreshLogger />
                                {process.env.NODE_ENV === 'development' && <PersistentLogger />}
                                <PWAErrorBoundary>
                                  <UnifiedNotificationProvider />
                                </PWAErrorBoundary>
                                <IOSInstallGuide />
                                <LazyInitializers />
                                <NavigationErrorBoundary>
                                  <div className="mobile-nav-padding">
                                    {children}
                                  </div>
                                </NavigationErrorBoundary>
                                <StunningBottomNavbar />
                                <MobileMenu />
                                <DesktopNavMenu />
                                <FloatingDonateButton />
                                <CompanionTrigger />
                                <GlobalVirtualCompanion />
                                <DevHelper />
                                <PWARecovery />
                                </div>
                              </EnhancedToastProvider>
                            </ToastProvider>
                          </QuickContextProvider>
                        </AchievementToastManager>
                      </OnboardingWrapper>
                    </PWAWrapper>
                    </VirtualCompanionProvider>
                  </NotificationServiceProvider>
                </CombinedFeatureProvider>
              </CombinedAuthProvider>
            </CombinedUIProvider>
          </NextAuthProvider>
        </EnvProvider>
      </body>
    </html>
  );
}

// No duplicate component needed as we're importing it from @/components/ClientThemeWrapper
