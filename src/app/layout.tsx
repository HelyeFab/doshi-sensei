import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import StunningBottomNavbar from "@/components/StunningBottomNavbar";
import DesktopNavMenu from "@/components/DesktopNavMenu";
import FloatingDonateButton from "@/components/FloatingDonateButton";
import GlobalVirtualCompanion from "@/components/GlobalVirtualCompanion";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { VirtualCompanionProvider } from "@/contexts/VirtualCompanionContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { AuthProvider } from "@/contexts/AuthContext";

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
        <LanguageProvider>
          <SettingsProvider>
            <AuthProvider>
              <VirtualCompanionProvider>
                <div className="min-h-screen pb-16 md:pb-0">
                  {children}
                </div>
                <StunningBottomNavbar />
                <DesktopNavMenu />
                <FloatingDonateButton />
                <GlobalVirtualCompanion />
              </VirtualCompanionProvider>
            </AuthProvider>
          </SettingsProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}