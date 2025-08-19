'use client';

import { Suspense } from 'react';
import { DatabaseErrorBoundary } from '@/components/ErrorBoundary/DatabaseErrorBoundary';
import LearnContent from './LearnContent';

export default function LearnPage() {
  return (
    <DatabaseErrorBoundary>
      <Suspense fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      }>
        <LearnContent />
      </Suspense>
    </DatabaseErrorBoundary>
  );
}