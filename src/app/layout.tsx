import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import StunningBottomNavbar from "@/components/StunningBottomNavbar";
import DesktopNavMenu from "@/components/DesktopNavMenu";
import FloatingDonateButton from "@/components/FloatingDonateButton";
import GlobalVirtualCompanion from "@/components/GlobalVirtualCompanion";
import GlobalToastContainer from "@/components/GlobalToastContainer";
import { UnifiedNotificationProvider } from "@/components/UnifiedNotificationProvider";
import { CriticalProviders, NonCriticalProviders } from "@/components/OptimizedProviders";
import { VirtualCompanionProvider } from "@/contexts/VirtualCompanionContext";
import { BackgroundSyncProvider } from "@/contexts/BackgroundSyncContext";
import PWAUpdateNotification from "@/components/PWAUpdateNotification";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

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
    ],
    apple: [
      { url: "/icons/apple-touch-icon-57x57.png", sizes: "57x57" },
      { url: "/icons/apple-touch-icon-60x60.png", sizes: "60x60" },
      { url: "/icons/apple-touch-icon-72x72.png", sizes: "72x72" },
      { url: "/icons/apple-touch-icon-76x76.png", sizes: "76x76" },
      { url: "/icons/apple-touch-icon-114x114.png", sizes: "114x114" },
      { url: "/icons/apple-touch-icon-120x120.png", sizes: "120x120" },
      { url: "/icons/apple-touch-icon-144x144.png", sizes: "144x144" },
      { url: "/icons/apple-touch-icon-152x152.png", sizes: "152x152" },
      { url: "/icons/apple-touch-icon-180x180.png", sizes: "180x180" },
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
    <html lang="en" className={rubik.variable}>
      <head>
        <script src="/register-sw.js" defer />
      </head>
      <body className={rubik.className}>
        <CriticalProviders>
          <NonCriticalProviders>
            <BackgroundSyncProvider>
              <VirtualCompanionProvider>
              <div className="min-h-screen pb-16 md:pb-0">
                {children}
              </div>
              <StunningBottomNavbar />
              <DesktopNavMenu />
              <FloatingDonateButton />
              <GlobalVirtualCompanion />
              <GlobalToastContainer />
              <UnifiedNotificationProvider />
              <PWAUpdateNotification />
              <PWAInstallPrompt />
              </VirtualCompanionProvider>
            </BackgroundSyncProvider>
          </NonCriticalProviders>
        </CriticalProviders>
      </body>
    </html>
  );
}