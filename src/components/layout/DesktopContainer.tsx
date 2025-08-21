import React from 'react';

interface DesktopContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Consistent desktop container that applies the same max-width margins
 * as the homepage for desktop view
 */
export function DesktopContainer({ children, className = '' }: DesktopContainerProps) {
  return (
    <div className={`md:mx-16 lg:mx-32 xl:mx-48 2xl:mx-64 ${className}`}>
      {children}
    </div>
  );
}