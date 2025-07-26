'use client';

import React from 'react';
import Link from 'next/link'
import { SmartNavigationLink } from '@/components/navigation/SmartNavigationLink';
import { useNavigation } from '@/contexts/NavigationContext';
import { ChevronRight } from 'lucide-react';
import type { NavigationEntry } from '@/types/navigation';

interface BreadcrumbsProps {
  // Maximum number of items to show (excluding current)
  maxItems?: number;
  // Whether to show on mobile
  showOnMobile?: boolean;
  // Custom separator
  separator?: React.ReactNode;
  // Custom class names
  className?: string;
  itemClassName?: string;
  separatorClassName?: string;
  currentClassName?: string;
}

export function Breadcrumbs({
  maxItems = 3,
  showOnMobile = false,
  separator,
  className = '',
  itemClassName = '',
  separatorClassName = '',
  currentClassName = ''
}: BreadcrumbsProps) {
  const navigation = useNavigation();
  const stack = navigation.stack;
  
  // Don't show if stack is too small
  if (stack.length <= 1) {
    return null;
  }
  
  // Get items to display (excluding current page)
  let items = stack.slice(0, -1);
  
  // Limit items if needed
  if (items.length > maxItems) {
    items = [
      items[0], // Always show home/first item
      ...items.slice(-(maxItems - 1))
    ];
  }
  
  const currentItem = stack[stack.length - 1];
  
  return (
    <nav
      aria-label="Breadcrumb"
      className={`${showOnMobile ? '' : 'hidden md:block'} ${className}`}
    >
      <ol className="flex items-center space-x-2 text-sm">
        {items.map((item, index) => (
          <React.Fragment key={item.id}>
            {index > 0 && (
              <li className={`text-gray-400 ${separatorClassName}`}>
                {separator || <ChevronRight className="w-4 h-4" />}
              </li>
            )}
            <li>
              <SmartNavigationLink 
                href={item.path}
                title={item.title}
                className={`text-gray-600 hover:text-gray-900 transition-colors ${itemClassName}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigation.goToEntry(item.id);
                }}
              >
                {item.title}
              </SmartNavigationLink>
            </li>
          </React.Fragment>
        ))}
        
        {/* Separator before current */}
        <li className={`text-gray-400 ${separatorClassName}`}>
          {separator || <ChevronRight className="w-4 h-4" />}
        </li>
        
        {/* Current page */}
        <li className={`text-gray-900 font-medium ${currentClassName}`}>
          {currentItem.title}
        </li>
      </ol>
    </nav>
  );
}

// Mobile-optimized breadcrumbs with horizontal scroll
export function MobileBreadcrumbs(props: BreadcrumbsProps) {
  return (
    <Breadcrumbs
      {...props}
      showOnMobile={true}
      className={`overflow-x-auto whitespace-nowrap pb-2 ${props.className || ''}`}
    />
  );
}