import { Metadata } from 'next';
import ConsoleMonitorClient from './ConsoleMonitorClient';
import { generatePageMetadata } from '@/utils/seo';

export const metadata: Metadata = generatePageMetadata({
  title: 'Admin - Console Monitor',
  description: 'Monitor and debug console logs by category for the Doshi Sensei platform.',
  path: '/admin/console-monitor',
});

export default function ConsoleMonitorPage() {
  return <ConsoleMonitorClient />;
}