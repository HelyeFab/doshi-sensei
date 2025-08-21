import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import StunningBottomNavbar from "@/components/StunningBottomNavbar";
import DesktopNavMenu from "@/components/DesktopNavMenu";
import FloatingDonateButton from "@/components/FloatingDonateButton";
import GlobalVirtualCompanion from "@/components/GlobalVirtualCompanion";
import GlobalToastContainer from "@/components/GlobalToastContainer";
import { UnifiedNotificationProvider } from "@/components/UnifiedNotificationProvider";
import { CriticalProviders, NonCriticalProviders } from "@/components/OptimizedProviders";
import { VirtualCompanionProvider } from "@/contexts/VirtualCompanionContext";

const rubik = Rubik({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-rubik",
});

export const metadata: Metadata = {
  title: "Dōshi Sensei - Japanese Learning Platform",
  description: "Master Japanese with our comprehensive learning platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={rubik.variable}>
      <body className={`${rubik.className} antialiased`}>
        <CriticalProviders>
          <NonCriticalProviders>
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
            </VirtualCompanionProvider>
          </NonCriticalProviders>
        </CriticalProviders>
      </body>
    </html>
  );
}