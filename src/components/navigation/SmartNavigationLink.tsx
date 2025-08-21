'use client';

import React from 'react';
import Link from 'next/link';

interface SmartNavigationLinkProps {
  href: string;
  title?: string;
  type?: 'page' | 'modal' | 'action';
  metadata?: Record<string, any>;
  children: React.ReactNode;
  preserveCurrentState?: boolean;
  stateToPreserve?: any;
  prefetchOnMount?: boolean;
  prefetchOnHover?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  [key: string]: any;
}

// Simplified SmartNavigationLink that just wraps Next.js Link
export function SmartNavigationLink({
  href,
  children,
  className,
  onClick,
  // Ignore navigation-specific props
  title,
  type,
  metadata,
  preserveCurrentState,
  stateToPreserve,
  prefetchOnMount,
  prefetchOnHover,
  ...props
}: SmartNavigationLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      onClick={onClick}
      {...props}
    >
      {children}
    </Link>
  );
}