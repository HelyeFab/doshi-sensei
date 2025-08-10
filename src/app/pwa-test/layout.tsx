import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "PWA Test Dashboard - Doshi Sensei",
  description: "Test PWA installation, updates, and connection status",
};

export default function PWATestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50">{children}</div>
    </ToastProvider>
  );
}
