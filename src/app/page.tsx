import ClientHome from '@/components/ClientHome';

export const dynamic = 'force-dynamic';

export default function Home() {
  // Don't calculate date on server to avoid hydration mismatches
  // Pass null values and let client handle it
  return <ClientHome initialDate={null} initialProgress={null} />;
}