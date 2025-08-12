'use client';

import dynamic from 'next/dynamic';

// Dynamically import debugger to avoid SSR issues
const ConjugationDebugger = dynamic(
  () => import('@/components/debug/ConjugationDebugger').then(mod => mod.ConjugationDebugger),
  { ssr: false }
);

export default function ConjugationDebugWrapper() {
  return <ConjugationDebugger />;
}