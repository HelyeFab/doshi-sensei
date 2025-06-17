import type { Metadata } from "next";
import { Geist, Geist_Mono, Lato, Dancing_Script } from "next/font/google";
import "./globals.css";
import { strings } from "@/config/strings";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { ClientThemeWrapper } from "@/components/ClientThemeWrapper";
import { EnvProvider } from "@/components/EnvProvider";
import BottomNavigation from "@/components/BottomNavigation";
import DesktopNavMenu from "@/components/DesktopNavMenu";
import PWAInstaller from "@/components/PWAInstaller";
import FloatingDonateButton from "@/components/FloatingDonateButton";

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
  title: strings.appName,
  description: strings.appDescription,
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#6366f1',
};

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
          <SettingsProvider>
            <AuthProvider>
              <SubscriptionProvider>
                {/* Use a client component to connect settings to theme */}
                <ClientThemeWrapper>
                  <div className="min-h-screen bg-background text-foreground">
                    {children}
                    <BottomNavigation />
                    <DesktopNavMenu />
                    <PWAInstaller />
                    <FloatingDonateButton />
                  </div>
                </ClientThemeWrapper>
              </SubscriptionProvider>
            </AuthProvider>
          </SettingsProvider>
        </EnvProvider>
      </body>
    </html>
  );
}

// No duplicate component needed as we're importing it from @/components/ClientThemeWrapper
