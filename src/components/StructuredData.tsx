'use client';

<<<<<<< HEAD
import { useEffect, useState } from 'react';

interface StructuredDataProps {
  data: Record<string, any>;
}

export default function StructuredData({ data }: StructuredDataProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only render on client after mount to avoid hydration issues
  if (!mounted) return null;

=======
interface StructuredDataProps {
  data: any;
}

export function StructuredData({ data }: StructuredDataProps) {
>>>>>>> SEO-v-3
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data),
      }}
    />
  );
}