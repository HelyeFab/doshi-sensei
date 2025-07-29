/**
 * Complete MCP SEO Solution for Interactive Next.js Apps
 * 
 * This enhanced optimizer detects and properly handles:
 * 1. Client Components (with 'use client')
 * 2. Server Components 
 * 3. Dynamic routes needing generateMetadata
 * 4. Existing metadata patterns
 * 5. Complex import structures
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import glob from 'fast-glob';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';

interface SEOConfig {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  targetKeywords?: string[];
  language?: string;
  locale?: string;
  social?: {
    twitter?: string;
    facebook?: string;
  };
  [key: string]: any;
}

interface OptimizationResult {
  filesModified: string[];
  filesCreated: string[];
  improvements: string[];
  warnings: string[];
}

interface PageAnalysis {
  isClientComponent: boolean;
  hasMetadata: boolean;
  hasGenerateMetadata: boolean;
  isDynamicRoute: boolean;
  defaultExportName: string | null;
  imports: string[];
  hasStructuredData: boolean;
}

export async function optimizeSEOComplete(
  projectPath: string,
  config: SEOConfig,
  mode: 'analyze' | 'fix' | 'auto' = 'auto'
): Promise<OptimizationResult> {
  const result: OptimizationResult = {
    filesModified: [],
    filesCreated: [],
    improvements: [],
    warnings: [],
  };

  try {
    const appDir = await detectAppDir(projectPath);
    if (!appDir) {
      result.warnings.push('No App Router detected. This optimizer is designed for Next.js App Router.');
      return result;
    }

    const pageFiles = await glob(`${appDir}/**/page.{tsx,ts,jsx,js}`, {
      cwd: projectPath,
      ignore: ['**/node_modules/**', '**/_*', '**/components/**'],
    });

    for (const pageFile of pageFiles) {
      await processPage(projectPath, pageFile, config, result, mode);
    }

    // Update root layout if needed
    await updateRootLayout(projectPath, appDir, config, result, mode);

    return result;
  } catch (error) {
    throw new Error(`SEO optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function detectAppDir(projectPath: string): Promise<string | null> {
  const candidates = ['app', 'src/app'];
  for (const dir of candidates) {
    const fullPath = path.join(projectPath, dir);
    try {
      const stats = await fs.stat(fullPath);
      if (stats.isDirectory()) {
        return dir;
      }
    } catch {}
  }
  return null;
}

async function processPage(
  projectPath: string,
  pageFile: string,
  config: SEOConfig,
  result: OptimizationResult,
  mode: string
): Promise<void> {
  const filePath = path.join(projectPath, pageFile);
  const content = await fs.readFile(filePath, 'utf-8');
  const analysis = analyzePage(content, pageFile);

  // Skip if already has metadata
  if (analysis.hasMetadata || analysis.hasGenerateMetadata) {
    result.improvements.push(`${pageFile} already has metadata configuration`);
    return;
  }

  if (mode === 'analyze') {
    result.improvements.push(`Would add metadata to ${pageFile}`);
    return;
  }

  // Determine the best approach based on analysis
  if (analysis.isClientComponent) {
    await handleClientComponentPattern(projectPath, pageFile, content, analysis, config, result);
  } else if (analysis.isDynamicRoute) {
    await addGenerateMetadata(filePath, content, pageFile, config, result);
  } else {
    await addStaticMetadata(filePath, content, pageFile, config, result);
  }
}

function analyzePage(content: string, pageFile: string): PageAnalysis {
  const analysis: PageAnalysis = {
    isClientComponent: false,
    hasMetadata: false,
    hasGenerateMetadata: false,
    isDynamicRoute: false,
    defaultExportName: null,
    imports: [],
    hasStructuredData: false,
  };

  // Check for client component
  analysis.isClientComponent = /^['"]use client['"]/.test(content.trim());

  // Check for existing metadata
  analysis.hasMetadata = /export\s+const\s+metadata/.test(content);
  analysis.hasGenerateMetadata = /export\s+(?:async\s+)?function\s+generateMetadata/.test(content);

  // Check if dynamic route
  analysis.isDynamicRoute = pageFile.includes('[') && pageFile.includes(']');

  // Check for structured data
  analysis.hasStructuredData = content.includes('StructuredData') || content.includes('application/ld+json');

  // Parse for more detailed analysis
  try {
    const ast = parse(content, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });

    traverse(ast, {
      ExportDefaultDeclaration(path) {
        if (t.isFunctionDeclaration(path.node.declaration)) {
          analysis.defaultExportName = path.node.declaration.id?.name || 'Component';
        } else if (t.isIdentifier(path.node.declaration)) {
          analysis.defaultExportName = path.node.declaration.name;
        }
      },
      ImportDeclaration(path) {
        analysis.imports.push(path.node.source.value);
      },
    });
  } catch (error) {
    // Fallback to regex if parsing fails
    const exportMatch = content.match(/export\s+default\s+(?:function\s+)?(\w+)/);
    analysis.defaultExportName = exportMatch?.[1] || 'Component';
  }

  return analysis;
}

async function handleClientComponentPattern(
  projectPath: string,
  pageFile: string,
  content: string,
  analysis: PageAnalysis,
  config: SEOConfig,
  result: OptimizationResult
): Promise<void> {
  const dir = path.dirname(pageFile);
  const componentName = analysis.defaultExportName || 'PageComponent';
  
  // Check if this already follows the wrapper pattern
  if (content.includes(`import ${componentName} from './${componentName}'`)) {
    result.improvements.push(`${pageFile} already follows wrapper pattern`);
    return;
  }

  // Generate new filenames
  const clientComponentName = `${componentName}.tsx`;
  const clientComponentPath = path.join(projectPath, dir, clientComponentName);
  
  // Check if client component file already exists
  const clientExists = await fs.access(clientComponentPath).then(() => true).catch(() => false);
  if (clientExists) {
    result.warnings.push(`${clientComponentName} already exists, skipping ${pageFile}`);
    return;
  }

  // Move content to client component
  await fs.writeFile(clientComponentPath, content);
  result.filesCreated.push(clientComponentPath);

  // Create wrapper
  const wrapperContent = generateSmartWrapper(componentName, pageFile, config, analysis);
  await fs.writeFile(path.join(projectPath, pageFile), wrapperContent);
  result.filesModified.push(pageFile);
  
  result.improvements.push(`Converted ${pageFile} to wrapper pattern for client component`);
}

async function addGenerateMetadata(
  filePath: string,
  content: string,
  pageFile: string,
  config: SEOConfig,
  result: OptimizationResult
): Promise<void> {
  const metadata = generateDynamicMetadataFunction(pageFile, config);
  
  // Add imports if needed
  let updatedContent = content;
  if (!content.includes("from 'next'") && !content.includes('from "next"')) {
    updatedContent = `import { Metadata } from 'next';\n` + updatedContent;
  }

  // Insert after imports
  const importEndIndex = findImportEndIndex(updatedContent);
  updatedContent = 
    updatedContent.slice(0, importEndIndex) +
    '\n\n' + metadata + '\n' +
    updatedContent.slice(importEndIndex);

  await fs.writeFile(filePath, updatedContent);
  result.filesModified.push(pageFile);
  result.improvements.push(`Added generateMetadata to dynamic route: ${pageFile}`);
}

async function addStaticMetadata(
  filePath: string,
  content: string,
  pageFile: string,
  config: SEOConfig,
  result: OptimizationResult
): Promise<void> {
  const metadata = generateStaticMetadata(pageFile, config);
  
  // Add imports if needed
  let updatedContent = content;
  if (!content.includes("from 'next'") && !content.includes('from "next"')) {
    updatedContent = `import { Metadata } from 'next';\n` + updatedContent;
  }

  // Insert after imports
  const importEndIndex = findImportEndIndex(updatedContent);
  updatedContent = 
    updatedContent.slice(0, importEndIndex) +
    '\n\n' + metadata + '\n' +
    updatedContent.slice(importEndIndex);

  await fs.writeFile(filePath, updatedContent);
  result.filesModified.push(pageFile);
  result.improvements.push(`Added metadata to server component: ${pageFile}`);
}

function generateSmartWrapper(
  componentName: string,
  pageFile: string,
  config: SEOConfig,
  analysis: PageAnalysis
): string {
  const routeInfo = parseRoute(pageFile);
  const title = formatRouteTitle(routeInfo);
  const description = generateDescription(routeInfo, config);
  const url = generateUrl(routeInfo, config);

  let imports = `import { Metadata } from 'next';\nimport ${componentName} from './${componentName}';`;
  
  // Add StructuredData if the original had it
  if (analysis.hasStructuredData) {
    imports += `\nimport StructuredData from '@/components/StructuredData';`;
  }

  const metadata = `
export const metadata: Metadata = {
  title: '${title} | ${config.siteName}',
  description: '${description}',
  keywords: ${JSON.stringify(generateKeywords(routeInfo, config))},
  openGraph: {
    title: '${title} | ${config.siteName}',
    description: '${description}',
    type: 'website',
    url: '${url}',
  },
  twitter: {
    card: 'summary_large_image',
    title: '${title} | ${config.siteName}',
    description: '${description}',
  },
};`;

  let pageContent = `
export default function Page() {
  return (
    <>
      ${analysis.hasStructuredData ? '<StructuredData />' : ''}
      <${componentName} />
    </>
  );
}`;

  return `${imports}\n${metadata}\n${pageContent}`;
}

function generateDynamicMetadataFunction(pageFile: string, config: SEOConfig): string {
  const routeInfo = parseRoute(pageFile);
  const baseTitle = formatRouteTitle(routeInfo);
  
  return `export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { [key: string]: string | string[] };
  searchParams: { [key: string]: string | string[] | undefined };
}): Promise<Metadata> {
  // Extract dynamic values
  const id = params.id || params.slug || params[Object.keys(params)[0]];
  
  // You can fetch data here if needed
  // const data = await fetchData(id);
  
  const title = id ? \`\${id} - ${baseTitle}\` : '${baseTitle}';
  const description = \`${baseTitle} - ${config.siteDescription}\`;
  
  return {
    title: \`\${title} | ${config.siteName}\`,
    description,
    openGraph: {
      title: \`\${title} | ${config.siteName}\`,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: \`\${title} | ${config.siteName}\`,
      description,
    },
  };
}`;
}

function generateStaticMetadata(pageFile: string, config: SEOConfig): string {
  const routeInfo = parseRoute(pageFile);
  const title = formatRouteTitle(routeInfo);
  const description = generateDescription(routeInfo, config);
  
  return `export const metadata: Metadata = {
  title: '${title} | ${config.siteName}',
  description: '${description}',
  keywords: ${JSON.stringify(generateKeywords(routeInfo, config))},
  openGraph: {
    title: '${title} | ${config.siteName}',
    description: '${description}',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: '${title} | ${config.siteName}',
    description: '${description}',
  },
};`;
}

async function updateRootLayout(
  projectPath: string,
  appDir: string,
  config: SEOConfig,
  result: OptimizationResult,
  mode: string
): Promise<void> {
  const layoutPath = path.join(projectPath, appDir, 'layout.tsx');
  const layoutExists = await fs.access(layoutPath).then(() => true).catch(() => false);
  
  if (!layoutExists) {
    result.warnings.push('No root layout found');
    return;
  }

  const content = await fs.readFile(layoutPath, 'utf-8');
  
  if (content.includes('export const metadata')) {
    result.improvements.push('Root layout already has metadata');
    return;
  }

  if (mode === 'analyze') {
    result.improvements.push('Would add default metadata to root layout');
    return;
  }

  // Generate comprehensive root metadata
  const rootMetadata = generateRootMetadata(config);
  
  // Insert after imports
  const importEndIndex = findImportEndIndex(content);
  const newContent = 
    content.slice(0, importEndIndex) +
    '\n\n' + rootMetadata + '\n' +
    content.slice(importEndIndex);

  await fs.writeFile(layoutPath, newContent);
  result.filesModified.push(layoutPath);
  result.improvements.push('Added default metadata to root layout');
}

function generateRootMetadata(config: SEOConfig): string {
  return `export const metadata: Metadata = {
  metadataBase: new URL('${config.siteUrl}'),
  title: {
    default: '${config.siteName}',
    template: '%s | ${config.siteName}',
  },
  description: '${config.siteDescription}',
  keywords: ${JSON.stringify(config.targetKeywords || [])},
  authors: [{ name: '${config.siteName}' }],
  creator: '${config.siteName}',
  publisher: '${config.siteName}',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: '${config.siteName}',
    description: '${config.siteDescription}',
    url: '${config.siteUrl}',
    siteName: '${config.siteName}',
    locale: '${config.locale || 'en_US'}',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '${config.siteName}',
    description: '${config.siteDescription}',${config.social?.twitter ? `
    creator: '${config.social.twitter}',` : ''}
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};`;
}

// Helper functions
function parseRoute(pageFile: string): { segments: string[]; isDynamic: boolean; params: string[] } {
  const segments = pageFile.split('/').filter(s => s && s !== 'page.tsx' && s !== 'page.ts');
  const params: string[] = [];
  const isDynamic = segments.some(s => {
    if (s.startsWith('[') && s.endsWith(']')) {
      params.push(s.slice(1, -1));
      return true;
    }
    return false;
  });
  
  return { segments, isDynamic, params };
}

function formatRouteTitle(routeInfo: { segments: string[] }): string {
  const lastSegment = routeInfo.segments[routeInfo.segments.length - 1] || 'Home';
  return lastSegment
    .replace(/\[|\]/g, '')
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function generateDescription(routeInfo: { segments: string[] }, config: SEOConfig): string {
  const pageName = formatRouteTitle(routeInfo);
  return `${pageName} - ${config.siteDescription}`;
}

function generateUrl(routeInfo: { segments: string[] }, config: SEOConfig): string {
  const path = routeInfo.segments.filter(s => !s.startsWith('[')).join('/');
  return `${config.siteUrl}${path ? '/' + path : ''}`;
}

function generateKeywords(routeInfo: { segments: string[] }, config: SEOConfig): string[] {
  const pageKeywords = routeInfo.segments
    .filter(s => !s.startsWith('['))
    .flatMap(s => s.split(/[-_]/))
    .filter(w => w.length > 2);
  
  return [...new Set([...config.targetKeywords || [], ...pageKeywords])];
}

function findImportEndIndex(content: string): number {
  const lines = content.split('\n');
  let lastImportIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trimStart().startsWith('import ')) {
      lastImportIndex = i;
    }
  }
  
  if (lastImportIndex === -1) {
    // No imports found, insert after 'use client' if present
    const useClientIndex = lines.findIndex(line => 
      line.includes("'use client'") || line.includes('"use client"')
    );
    if (useClientIndex !== -1) {
      return lines.slice(0, useClientIndex + 1).join('\n').length + 1;
    }
    return 0;
  }
  
  return lines.slice(0, lastImportIndex + 1).join('\n').length + 1;
}