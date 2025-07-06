import type { Metadata } from "next";
import { Geist, Geist_Mono, Lato, Dancing_Script } from "next/font/google";
import "./globals.css";
import { strings } from "@/config/strings";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminProvider } from "@/contexts/AdminContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ClientThemeWrapper } from "@/components/ClientThemeWrapper";
import { ToastContainer } from "@/components/ui/Toast";
import { EnvProvider } from "@/components/EnvProvider";
import BottomNavigation from "@/components/BottomNavigation";
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

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
});

const savoyeFont = Dancing_Script({
  variable: "--font-savoye",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: 'Doshi Sensei - Master Japanese Verb Conjugations',
    template: '%s | Doshi Sensei'
  },
  description: 'Learn Japanese verb and adjective conjugations with interactive practice, drills, and vocabulary. Master ichidan, godan, and irregular verbs with professional guidance.',
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
  },
  openGraph: {
    title: 'Doshi Sensei - Master Japanese Verb Conjugations',
    description: 'Learn Japanese verb and adjective conjugations with interactive practice, drills, and vocabulary. Master ichidan, godan, and irregular verbs.',
    url: 'https://doshisensei.com',
    siteName: 'Doshi Sensei',
    images: [
      {
        url: '/doshi.png',
        width: 1200,
        height: 630,
        alt: 'Doshi Sensei - Japanese Learning App',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Doshi Sensei - Master Japanese Verb Conjugations',
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
  themeColor: '#6366f1',
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
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Doshi Sensei" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
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
        <link rel="shortcut icon" href="/favicon.ico" />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('doshi_sensei_settings');
                  var theme = 'system';
                  if (stored) {
                    var settings = JSON.parse(stored);
                    theme = settings.theme || 'system';
                  }

                  var root = document.documentElement;
                  var systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  var effectiveTheme = theme === 'system' ? systemTheme : theme;

                  root.classList.remove('dark', 'light');
                  root.classList.add(effectiveTheme);
                } catch (e) {
                  // Fallback to system theme if anything fails
                  var root = document.documentElement;
                  var systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  root.classList.remove('dark', 'light');
                  root.classList.add(systemTheme);
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${lato.variable} ${savoyeFont.variable} antialiased min-h-screen`}
        suppressHydrationWarning
      >
        <EnvProvider>
          <KanjiSelectionProvider>
            <SettingsProvider>
              <AuthProvider>
                <NotificationProvider>
                    <AdminProvider>
                      <ModalProvider>
                        {/* Use a client component to connect settings to theme */}
                        <ClientThemeWrapper>
                          <PWAWrapper>
                            <OnboardingWrapper>
                              <div className="min-h-screen bg-background text-foreground">
                                <OfflineNotification />
                                <JMdictInitializer />
                                {children}
                                <BottomNavigation />
                                <PWAInstaller />
                                <PWAUpdateNotification />
                                <FloatingDonateButton />
                                <CompanionTrigger />
                                <ToastContainer />
                              </div>
                            </OnboardingWrapper>
                          </PWAWrapper>
                        </ClientThemeWrapper>
                      </ModalProvider>
                    </AdminProvider>
                </NotificationProvider>
              </AuthProvider>
            </SettingsProvider>
          </KanjiSelectionProvider>
        </EnvProvider>
      </body>
    </html>
  );
}

// No duplicate component needed as we're importing it from @/components/ClientThemeWrapper
