import { Metadata } from 'next';
import PricingConfigPage from './PricingConfigPage';
import { generatePageMetadata } from '@/utils/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = generatePageMetadata({
  title: 'Pricing Configuration',
  description: 'Manage subscription pricing for Doshi Sensei',
  path: '/admin/pricing',
});

export default function Page() {
  return <PricingConfigPage />;
}