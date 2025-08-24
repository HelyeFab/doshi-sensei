import Link from 'next/link';
import { ComponentProps } from 'react';

// Pages that are known to be heavy and cause timeouts
const HEAVY_PAGES = [
  '/vocabulary',
  '/drill',
  '/practice',
  '/admin',
  '/news',
  '/stories',
  '/kanji-browser',
  '/kanji-moods',
  '/achievements',
  '/tools/kanji-mastery'  // Added - was causing 502 errors
];

/**
 * Smart Link component that automatically disables prefetching for heavy pages
 * This prevents the "thundering herd" problem where multiple heavy pages
 * are prefetched simultaneously, causing serverless function timeouts
 */
export function SmartLink(props: ComponentProps<typeof Link>) {
  const { href, ...rest } = props;
  
  // Check if this link points to a heavy page
  const isHeavyPage = HEAVY_PAGES.some(page => 
    typeof href === 'string' && href.startsWith(page)
  );
  
  // Disable prefetch for heavy pages unless explicitly set
  const prefetch = props.prefetch !== undefined ? props.prefetch : !isHeavyPage;
  
  return <Link href={href} prefetch={prefetch} {...rest} />;
}