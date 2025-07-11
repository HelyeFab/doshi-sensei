'use client';

import Link from 'next/link';
import { PageHelpIcon } from '@/components/PageHelpIcon';
import { pageHelpContent } from '@/config/pageHelp';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  helpKey?: string;
  onBackClick?: () => void;
  backHref?: string;
  rightAction?: JSX.Element;
}

export function PageHeader({ title, subtitle, showBackButton = true, helpKey, onBackClick, backHref = "/", rightAction }: PageHeaderProps) {
  const helpContent = helpKey ? pageHelpContent[helpKey] : null;

  const handleBackClick = (e: React.MouseEvent) => {
    if (onBackClick) {
      e.preventDefault();
      onBackClick();
    }
  };

  return (
    <header className="mb-8">
      <div className="flex items-center mb-4">
        {showBackButton && (
          <Link
            href={backHref}
            onClick={onBackClick ? handleBackClick : undefined}
            className="mr-4 p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors inline-flex items-center justify-center"
            aria-label="Go back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        )}

        <div className="flex-1 flex items-center justify-between gap-4">
          <h1 className="text-xl sm:text-3xl font-bold text-foreground">
            {title}
          </h1>
          {helpContent && (
            <div className="ml-auto">
              <PageHelpIcon
                title={helpContent.title}
                description={helpContent.description}
                tips={helpContent.tips}
              />
            </div>
          )}
        </div>
        {rightAction && (
          <div className="ml-4 flex-shrink-0 flex items-center">{rightAction}</div>
        )}
      </div>
      {subtitle && (
        <p className="text-muted-foreground mt-1">{subtitle}</p>
      )}
    </header>
  );
}
