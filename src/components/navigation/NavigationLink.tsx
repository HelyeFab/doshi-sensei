'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ComponentProps } from 'react';

interface NavigationLinkProps extends Omit<ComponentProps<typeof Link>, 'href'> {
  href: string;
  preserveFrom?: boolean;
}

/**
 * A wrapper around Next.js Link that preserves the 'from' query parameter
 * when navigating between pages. This ensures users can navigate back to
 * the correct origin page.
 */
export function NavigationLink({ 
  href, 
  preserveFrom = true, 
  children, 
  ...props 
}: NavigationLinkProps) {
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  
  // If we should preserve the 'from' parameter and it exists, add it to the href
  let finalHref = href;
  if (preserveFrom && from) {
    const separator = href.includes('?') ? '&' : '?';
    finalHref = `${href}${separator}from=${from}`;
  }
  
  return (
    <Link href={finalHref} {...props}>
      {children}
    </Link>
  );
}