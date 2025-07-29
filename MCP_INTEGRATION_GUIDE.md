# MCP SEO Server Integration Guide for Interactive Apps

## The Problem

The current MCP SEO server breaks interactive Next.js apps because it:
1. Adds `export const metadata` to all pages
2. Forces pages to be Server Components
3. Breaks client-side features (hooks, state, event handlers)

## The Solution

I've created an enhanced MCP optimizer that:
1. **Detects client components** (looks for 'use client')
2. **Creates wrapper pattern** for client components
3. **Supports dynamic routes** with generateMetadata
4. **Preserves existing patterns** (doesn't break working code)

## How to Integrate

### 1. Replace the optimizer.ts in MCP server

Replace `/home/mate/Dev/MCPs/nextjs-seo-mcp/src/optimizer.ts` with the enhanced version from `/home/mate/Dev/NextProjects/doshi-sensei/src/mcp-complete-solution.ts`

### 2. Install required dependencies

```bash
cd /home/mate/Dev/MCPs/nextjs-seo-mcp
npm install @babel/parser @babel/traverse @babel/generator @babel/types
```

### 3. Update the imports

The enhanced optimizer uses AST parsing for better code analysis.

## What It Does Differently

### For Client Components:
**Before:**
```tsx
// page.tsx
'use client';
export default function Page() {
  // Interactive code
}
```

**After:**
```tsx
// PageComponent.tsx (auto-created)
'use client';
export default function PageComponent() {
  // Interactive code (moved here)
}

// page.tsx (wrapper)
import { Metadata } from 'next';
import PageComponent from './PageComponent';

export const metadata: Metadata = {
  // SEO metadata
};

export default function Page() {
  return <PageComponent />;
}
```

### For Dynamic Routes:
Adds `generateMetadata` instead of static metadata:
```tsx
export async function generateMetadata({ params }) {
  return {
    title: `${params.id} | Site Name`,
    // Dynamic metadata
  };
}
```

## Benefits

1. **Preserves Interactivity**: Client components stay client-side
2. **Optimal SEO**: Server-side metadata for search engines
3. **No Manual Changes**: Automatic detection and handling
4. **Safe**: Won't break existing metadata patterns
5. **Smart**: Handles complex import structures

## Testing with Doshi Sensei

1. Run the enhanced optimizer:
```bash
node /home/mate/Dev/NextProjects/doshi-sensei/test-mcp-optimizer.js
```

2. Check that pages maintain their functionality
3. Verify metadata is properly added

## Key Features

- **AST-based analysis** for accurate code understanding
- **Intelligent file naming** to avoid conflicts
- **Comprehensive metadata** generation
- **Support for all routing patterns**
- **Preserves existing structured data**

## Why This Works

Next.js App Router requires:
- Metadata exports MUST be in Server Components
- Interactive features NEED Client Components

The wrapper pattern satisfies both requirements by:
- Server Component wrapper exports metadata
- Client Component child handles interactivity

This is the official Next.js recommended pattern for SEO + interactivity.