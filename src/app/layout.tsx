import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import StunningBottomNavbar from "@/components/StunningBottomNavbar";
import DesktopNavMenu from "@/components/DesktopNavMenu";
import FloatingDonateButton from "@/components/FloatingDonateButton";
import GlobalVirtualCompanion from "@/components/GlobalVirtualCompanion";
import { ToastProvider } from "@/contexts/ToastContext";
import { UnifiedNotificationProvider } from "@/components/UnifiedNotificationProvider";
import { CriticalProviders, NonCriticalProviders } from "@/components/OptimizedProviders";
import { VirtualCompanionProvider } from "@/contexts/VirtualCompanionContext";
import { BackgroundSyncProvider } from "@/contexts/BackgroundSyncContext";
import PWAUpdateNotification from "@/components/PWAUpdateNotification";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import SplashScreenMeta from "@/components/SplashScreenMeta";
import SplashScreen from "@/components/SplashScreen";
import QuickContextProvider from "@/components/QuickContext/QuickContextProvider";
import SyncInitializer from "@/components/SyncInitializer";

const rubik = localFont({
  src: [
    {
      path: "../../public/fonts/Rubik/static/Rubik-Light.ttf",
      weight: "300",
      style: "normal",
    },
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
  display: "swap",
  variable: "--font-rubik",
});

export const metadata: Metadata = {
  title: "Dōshi Sensei - Japanese Learning Platform",
  description: "Master Japanese with our comprehensive learning platform",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Dōshi Sensei",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon-1024x1024.png", sizes: "1024x1024" },
      { url: "/apple-touch-icon-180x180.png", sizes: "180x180" },
      { url: "/apple-touch-icon-167x167.png", sizes: "167x167" },
      { url: "/apple-touch-icon-152x152.png", sizes: "152x152" },
      { url: "/apple-touch-icon-120x120.png", sizes: "120x120" },
    ],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#8a5cf6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={rubik.variable} suppressHydrationWarning>
      <head>
        <SplashScreenMeta />
        <script src="/register-sw.js" defer />
      </head>
      <body className={`${rubik.className || ''}`} suppressHydrationWarning>
        <CriticalProviders>
          <NonCriticalProviders>
            <BackgroundSyncProvider>
              <VirtualCompanionProvider>
                <ToastProvider>
                  <QuickContextProvider>
                    <SplashScreen />
                    <SyncInitializer />
                    <div className="min-h-screen pb-16 md:pb-0">
                      {children}
                    </div>
                    <StunningBottomNavbar />
                    <DesktopNavMenu />
                    <FloatingDonateButton />
                    <GlobalVirtualCompanion />
                    <UnifiedNotificationProvider />
                    <PWAUpdateNotification />
                    <PWAInstallPrompt />
                  </QuickContextProvider>
                </ToastProvider>
              </VirtualCompanionProvider>
            </BackgroundSyncProvider>
          </NonCriticalProviders>
        </CriticalProviders>
      </body>
    </html>
  );
}