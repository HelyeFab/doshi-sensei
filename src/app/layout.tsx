import type { Metadata } from "next";
import { Geist, Geist_Mono, Lato, Dancing_Script } from "next/font/google";
import "./globals.css";
import { strings } from "@/config/strings";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ClientThemeWrapper } from "@/components/ClientThemeWrapper";
import { EnvProvider } from "@/components/EnvProvider";

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${lato.variable} ${savoyeFont.variable} antialiased min-h-screen`}
        suppressHydrationWarning
      >
        <EnvProvider>
          <SettingsProvider>
            {/* Use a client component to connect settings to theme */}
            <ClientThemeWrapper>
              <div className="min-h-screen bg-background text-foreground">
                {children}
              </div>
            </ClientThemeWrapper>
          </SettingsProvider>
        </EnvProvider>
      </body>
    </html>
  );
}

// No duplicate component needed as we're importing it from @/components/ClientThemeWrapper
