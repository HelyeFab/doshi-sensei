'use client';

import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
import Image from 'next/image';
import Link from 'next/link';
import { ReactNode } from 'react';

// Custom components for MDX
const components = {
  // Enhanced headings with anchors
  h1: ({ children, ...props }: { children: ReactNode }) => (
    <h1 className="text-3xl font-bold text-foreground mt-8 mb-4" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: { children: ReactNode }) => (
    <h2 className="text-2xl font-semibold text-foreground mt-6 mb-3" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: { children: ReactNode }) => (
    <h3 className="text-xl font-medium text-foreground mt-4 mb-2" {...props}>
      {children}
    </h3>
  ),
  
  // Paragraphs with proper spacing
  p: ({ children, ...props }: { children: ReactNode }) => (
    <p className="text-foreground/90 leading-relaxed mb-4" {...props}>
      {children}
    </p>
  ),
  
  // Lists with theme styling
  ul: ({ children, ...props }: { children: ReactNode }) => (
    <ul className="list-disc list-inside text-foreground/90 mb-4 ml-4" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: { children: ReactNode }) => (
    <ol className="list-decimal list-inside text-foreground/90 mb-4 ml-4" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }: { children: ReactNode }) => (
    <li className="mb-1" {...props}>
      {children}
    </li>
  ),
  
  // Links with theme colors
  a: ({ href, children, ...props }: { href?: string; children: ReactNode }) => {
    const isInternal = href?.startsWith('/') || href?.startsWith('#');
    
    if (isInternal) {
      return (
        <Link 
          href={href || '#'} 
          className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
          {...props}
        >
          {children}
        </Link>
      );
    }
    
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
        {...props}
      >
        {children}
      </a>
    );
  },
  
  // Code blocks with theme support
  pre: ({ children, ...props }: { children: ReactNode }) => (
    <pre className="bg-muted rounded-lg p-4 overflow-x-auto mb-4 border border-border" {...props}>
      {children}
    </pre>
  ),
  code: ({ children, ...props }: { children: ReactNode; className?: string }) => {
    const isInline = !props.className;
    return isInline ? (
      <code className="bg-muted px-1.5 py-0.5 rounded text-sm text-foreground" {...props}>
        {children}
      </code>
    ) : (
      <code className="text-sm" {...props}>
        {children}
      </code>
    );
  },
  
  // Images with Next.js optimization
  img: ({ src, alt, ...props }: { src?: string; alt?: string }) => {
    if (!src) return null;
    
    // Handle relative and absolute paths
    const imageSrc = src.startsWith('http') ? src : src;
    
    return (
      <div className="my-6">
        <img
          src={imageSrc}
          alt={alt || ''}
          className="rounded-lg w-full h-auto"
          loading="lazy"
          {...props}
        />
      </div>
    );
  },
  
  // Blockquotes with theme styling
  blockquote: ({ children, ...props }: { children: ReactNode }) => (
    <blockquote 
      className="border-l-4 border-primary/50 pl-4 my-4 italic text-foreground/80"
      {...props}
    >
      {children}
    </blockquote>
  ),
  
  // Tables with theme support
  table: ({ children, ...props }: { children: ReactNode }) => (
    <div className="overflow-x-auto mb-4">
      <table className="min-w-full divide-y divide-border" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }: { children: ReactNode }) => (
    <thead className="bg-muted" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }: { children: ReactNode }) => (
    <th className="px-4 py-2 text-left text-sm font-medium text-foreground" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }: { children: ReactNode }) => (
    <td className="px-4 py-2 text-sm text-foreground/90 border-t border-border" {...props}>
      {children}
    </td>
  ),
  
  // Horizontal rule
  hr: (props: any) => (
    <hr className="my-8 border-t border-border" {...props} />
  ),

  // Custom components for enhanced functionality
  
  // Callout/Alert component
  Callout: ({ type = 'info', children }: { type?: 'info' | 'warning' | 'success' | 'error'; children: ReactNode }) => {
    const styles = {
      info: 'bg-blue-500/10 border-blue-500/50 text-blue-900 dark:text-blue-100',
      warning: 'bg-amber-500/10 border-amber-500/50 text-amber-900 dark:text-amber-100',
      success: 'bg-green-500/10 border-green-500/50 text-green-900 dark:text-green-100',
      error: 'bg-red-500/10 border-red-500/50 text-red-900 dark:text-red-100',
    };
    
    const icons = {
      info: 'ℹ️',
      warning: '⚠️',
      success: '✅',
      error: '❌',
    };
    
    return (
      <div className={`border-l-4 p-4 my-4 rounded-r-lg ${styles[type]}`}>
        <div className="flex items-start gap-2">
          <span className="text-xl">{icons[type]}</span>
          <div className="flex-1">{children}</div>
        </div>
      </div>
    );
  },
  
  // Japanese text with furigana
  Ruby: ({ children, rt }: { children: ReactNode; rt: string }) => (
    <ruby className="text-foreground">
      {children}
      <rp>(</rp>
      <rt className="text-xs text-muted-foreground">{rt}</rt>
      <rp>)</rp>
    </ruby>
  ),
  
  // YouTube embed
  YouTube: ({ id }: { id: string }) => (
    <div className="relative pb-[56.25%] my-6">
      <iframe
        className="absolute top-0 left-0 w-full h-full rounded-lg"
        src={`https://www.youtube.com/embed/${id}`}
        title="YouTube video"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  ),
};

export default function MdxClient({ source }: { source: MDXRemoteSerializeResult }) {
  return (
    <article className="max-w-none">
      <MDXRemote {...source} components={components} />
    </article>
  );
}