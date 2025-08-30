import SmartHeader from '@/components/SmartHeader';

export default function ReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SmartHeader 
        title="Review Hub" 
        subtitle="Unified spaced repetition system"
        backHref="/" 
      />
      {children}
    </>
  );
}