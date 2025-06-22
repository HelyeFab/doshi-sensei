// Force dynamic rendering for all reading pages
export const dynamic = 'force-dynamic';

export default function ReadingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
