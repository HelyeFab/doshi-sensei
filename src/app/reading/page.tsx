'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Temporary: Redirect to news page to avoid duplicate content
export default function ReadingPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to news page
    router.replace('/news');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="text-4xl mb-4">📰</div>
        <p className="text-muted-foreground">Redirecting to news articles...</p>
      </div>
    </div>
  );
}