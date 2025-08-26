import type { Metadata } from 'next';
import PaymentMonitorDashboard from './PaymentMonitorDashboard';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = generatePageMetadata({
  title: 'Payment Monitor - Admin',
  description: 'Monitor payment system health, webhook status, and subscription metrics',
  path: '/admin/payment-monitor',
});

export default function PaymentMonitorPage() {
  const breadcrumbData = structuredData.breadcrumb([
    { name: "Home", url: "/" },
    { name: "Admin", url: "/admin" },
    { name: "Payment Monitor", url: "/admin/payment-monitor" }
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <PaymentMonitorDashboard />
    </>
  );
}