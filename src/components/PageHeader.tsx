'use client';

import Link from 'next/link';
import { PageHelpIcon } from '@/components/PageHelpIcon';
import { pageHelpContent } from '@/config/pageHelp';

interface PageHeaderProps {
  title?: string;
  emoji?: string;
  icon?: string;
  subtitle?: string;
  showBackButton?: boolean;
  helpKey?: string;
  onBackClick?: () => void;
  backHref?: string;
  backLabel?: string;
  rightAction?: JSX.Element;
}

export function PageHeader({ title, emoji, icon, subtitle, showBackButton = true, helpKey, onBackClick, backHref = "/", backLabel, rightAction }: PageHeaderProps) {
  const helpContent = helpKey ? pageHelpContent[helpKey] : null;

  const handleBackClick = (e: React.MouseEvent) => {
    if (onBackClick) {
      e.preventDefault();
      onBackClick();
    }
  };

  return (
    <header className="mb-8">
      <div className="relative flex items-center mb-4">
        {showBackButton && (
          <Link href={backHref}
            onClick={onBackClick ? handleBackClick : undefined}
            className="absolute left-0 p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors inline-flex items-center justify-center z-10"
            aria-label="Go back">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        )}

        <div className="absolute inset-0 flex items-center justify-center">
          {icon ? (
            <div className="text-4xl sm:text-6xl md:text-7xl text-center mt-4 mb-8">
              <img src={icon} alt="Page icon" className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24" />
            </div>
          ) : emoji ? (
            <div className="text-4xl sm:text-6xl md:text-7xl text-center">
              {emoji}
            </div>
          ) : title ? (
            <h1 className="text-xl sm:text-3xl font-bold text-foreground text-center">
              {title}
            </h1>
          ) : null}
        </div>

        {helpContent && (
          <div className="absolute right-0 z-10">
            <PageHelpIcon
              title={helpContent.title}
              description={helpContent.description}
              tips={helpContent.tips}
            />
          </div>
        )}
        {rightAction && (
          <div className="absolute right-0 z-10 flex items-center">{rightAction}</div>
        )}
      </div>
      {subtitle && (
        <p className="text-muted-foreground mt-1">{subtitle}</p>
      )}
    </header>
  );
}
