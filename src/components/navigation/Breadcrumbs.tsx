'use client';

import React from 'react';

interface BreadcrumbsProps {
  maxItems?: number;
  showOnMobile?: boolean;
  separator?: React.ReactNode;
  className?: string;
  itemClassName?: string;
  separatorClassName?: string;
  currentClassName?: string;
}

// Stub component - navigation breadcrumbs are not currently implemented
export function Breadcrumbs(props: BreadcrumbsProps) {
  // Return null for now since the navigation system was removed
  return null;
}