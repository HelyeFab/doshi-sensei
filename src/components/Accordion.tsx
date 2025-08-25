'use client';

import { useState, ReactNode } from 'react';

interface AccordionItemProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  icon?: ReactNode;
  className?: string;
}

export function AccordionItem({
  title,
  children,
  defaultOpen = false,
  icon,
  className = '',
}: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`border-b border-border ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-4 flex items-center justify-between text-left hover:bg-accent/10 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <span className="font-medium text-foreground">{title}</span>
        </div>
        <svg
          className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-4 text-muted-foreground">
          {children}
        </div>
      </div>
    </div>
  );
}

interface AccordionProps {
  children: ReactNode;
  className?: string;
  allowMultiple?: boolean;
}

export function Accordion({ 
  children, 
  className = '',
  allowMultiple = true 
}: AccordionProps) {
  return (
    <div className={`border border-border rounded-lg overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

// Collapsible component (simpler version for single items)
interface CollapsibleProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function Collapsible({
  title,
  children,
  defaultOpen = false,
  className = '',
}: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={className}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
        aria-expanded={isOpen}
      >
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? 'rotate-90' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="font-medium">{title}</span>
      </button>
      {isOpen && (
        <div className="mt-2 pl-6 animate-fadeIn">
          {children}
        </div>
      )}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}