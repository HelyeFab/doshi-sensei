import { AdminProvider } from '@/contexts/AdminContext';
import { AdminGuard } from '@/components/admin/AdminGuard';

export const metadata = {
  title: 'Admin Dashboard | Doshi Sensei',
  description: 'Administrative dashboard for Doshi Sensei',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProvider>
      <AdminGuard>
        {children}
      </AdminGuard>
    </AdminProvider>
  );
}
