import SmartHeader from '@/components/SmartHeader';

export default function ReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SmartHeader title="Review System" backHref="/" />
      {children}
    </>
  );
}