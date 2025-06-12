'use client';

import Link from 'next/link';

interface PageHeaderProps {
  title: string;
  showBackButton?: boolean;
}

export function PageHeader({ title, showBackButton = true }: PageHeaderProps) {
  return (
    <header className="mb-8">
      <div className="flex items-center mb-4">
        {showBackButton && (
          <Link
            href="/"
            className="mr-4 p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors inline-flex items-center justify-center"
            aria-label="Go back to home"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        )}

        <h1 className="text-3xl font-bold text-foreground">
          {title}
        </h1>
      </div>
    </header>
  );
}
