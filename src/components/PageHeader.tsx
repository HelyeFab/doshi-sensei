'use client';

import Link from 'next/link';
import { PageHelpIcon } from '@/components/PageHelpIcon';
import { pageHelpContent } from '@/config/pageHelp';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  helpKey?: string;
}

export function PageHeader({ title, subtitle, showBackButton = true, helpKey }: PageHeaderProps) {
  const helpContent = helpKey ? pageHelpContent[helpKey] : null;
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

        <div className="flex-1">
          <div className="flex items-center">
            <h1 className="text-3xl font-bold text-foreground">
              {title}
            </h1>
            {helpContent && (
              <PageHelpIcon
                title={helpContent.title}
                description={helpContent.description}
                tips={helpContent.tips}
              />
            )}
          </div>
          {subtitle && (
            <p className="text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </header>
  );
}
