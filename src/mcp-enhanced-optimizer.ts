import * as fs from 'fs/promises';
import * as path from 'path';
import glob from 'fast-glob';

interface SEOConfig {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  targetKeywords?: string[];
  language?: string;
  locale?: string;
  [key: string]: any;
}

interface OptimizationResult {
  filesModified: string[];
  filesCreated: string[];
  improvements: string[];
  warnings: string[];
}

/**
 * Enhanced SEO optimizer that works with both Server and Client Components
 */
export async function optimizeSEOEnhanced(
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
    // Detect router type
    const hasAppDir = await fs.access(path.join(projectPath, 'app')).then(() => true).catch(() => false);
    const hasSrcApp = await fs.access(path.join(projectPath, 'src/app')).then(() => true).catch(() => false);
    const isAppRouter = hasAppDir || hasSrcApp;

    if (isAppRouter) {
      await optimizeAppRouterEnhanced(projectPath, config, result);
    } else {
      // Pages router optimization remains the same
      result.warnings.push('Pages Router detected - using standard optimization');
    }

    return result;
  } catch (error) {
    throw new Error(`Failed to optimize SEO: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function optimizeAppRouterEnhanced(
  projectPath: string,
  config: SEOConfig,
  result: OptimizationResult
): Promise<void> {
  const appDir = await fs.access(path.join(projectPath, 'app')).then(() => 'app').catch(() => 'src/app');
  
  // Find all page files
  const pageFiles = await glob(`${appDir}/**/page.{tsx,ts,jsx,js}`, {
    cwd: projectPath,
    ignore: ['**/node_modules/**'],
  });

  for (const pageFile of pageFiles) {
    const filePath = path.join(projectPath, pageFile);
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Check if page already has metadata
    if (content.includes('export const metadata') || content.includes('generateMetadata')) {
      continue;
    }

    // Detect if this is a client component
    const isClientComponent = content.includes("'use client'") || content.includes('"use client"');
    
    if (isClientComponent) {
      // Handle client component with wrapper pattern
      await handleClientComponent(projectPath, pageFile, content, config, result);
    } else {
      // Handle server component normally
      await handleServerComponent(filePath, content, pageFile, config, result);
    }
  }
}

async function handleClientComponent(
  projectPath: string,
  pageFile: string,
  content: string,
  config: SEOConfig,
  result: OptimizationResult
): Promise<void> {
  const dir = path.dirname(pageFile);
  const pageName = path.basename(dir) || 'home';
  
  // Extract the component name
  const componentMatch = content.match(/export\s+default\s+(?:function\s+)?(\w+)/);
  const componentName = componentMatch ? componentMatch[1] : 'PageComponent';
  
  // Create a new filename for the client component
  const clientComponentName = `${componentName}.tsx`;
  const clientComponentPath = path.join(projectPath, dir, clientComponentName);
  
  // Move the original content to the new client component file
  await fs.writeFile(clientComponentPath, content);
  result.filesCreated.push(clientComponentPath);
  
  // Create the server component wrapper
  const wrapperContent = generateWrapperComponent(componentName, pageName, config);
  const pageFilePath = path.join(projectPath, pageFile);
  await fs.writeFile(pageFilePath, wrapperContent);
  result.filesModified.push(pageFilePath);
  
  result.improvements.push(`Created wrapper pattern for client component: ${pageFile}`);
}

async function handleServerComponent(
  filePath: string,
  content: string,
  pageFile: string,
  config: SEOConfig,
  result: OptimizationResult
): Promise<void> {
  const pageName = path.dirname(pageFile).split('/').pop() || 'home';
  const pageMetadata = generatePageMetadata(pageName, config);
  
  // Insert metadata after imports
  const importIndex = content.lastIndexOf('import');
  const insertIndex = content.indexOf('\n', importIndex) + 1;
  
  const newContent = 
    content.slice(0, insertIndex) +
    '\n' + pageMetadata + '\n' +
    content.slice(insertIndex);
  
  await fs.writeFile(filePath, newContent);
  result.filesModified.push(filePath);
  result.improvements.push(`Added metadata to server component: ${pageFile}`);
}

function generateWrapperComponent(componentName: string, pageName: string, config: SEOConfig): string {
  const title = formatTitle(pageName);
  const description = `${title} - ${config.siteDescription}`;
  
  return `import { Metadata } from 'next';
import ${componentName} from './${componentName}';

export const metadata: Metadata = {
  title: '${title} | ${config.siteName}',
  description: '${description}',
  keywords: ${JSON.stringify([...config.targetKeywords || [], title.toLowerCase()])},
  openGraph: {
    title: '${title} | ${config.siteName}',
    description: '${description}',
    type: 'website',
    url: '${config.siteUrl}/${pageName === 'home' ? '' : pageName}',
  },
  twitter: {
    card: 'summary',
    title: '${title} | ${config.siteName}',
    description: '${description}',
  },
};

export default function Page() {
  return <${componentName} />;
}
`;
}

function generatePageMetadata(pageName: string, config: SEOConfig): string {
  const title = formatTitle(pageName);
  const description = `${title} - ${config.siteDescription}`;
  
  return `export const metadata = {
  title: '${title} | ${config.siteName}',
  description: '${description}',
  keywords: ${JSON.stringify([...config.targetKeywords || [], title.toLowerCase()])},
  openGraph: {
    title: '${title} | ${config.siteName}',
    description: '${description}',
  },
};`;
}

function formatTitle(pageName: string): string {
  // Convert kebab-case or snake_case to Title Case
  return pageName
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Additional helper to detect and handle dynamic metadata needs
export async function analyzeMetadataNeeds(content: string): Promise<{
  needsDynamicMetadata: boolean;
  usesParams: boolean;
  usesSearchParams: boolean;
  hasDataFetching: boolean;
}> {
  return {
    needsDynamicMetadata: content.includes('params') || content.includes('searchParams'),
    usesParams: content.includes('params.') || content.includes('params['),
    usesSearchParams: content.includes('searchParams.') || content.includes('searchParams['),
    hasDataFetching: content.includes('fetch(') || content.includes('await ') || content.includes('.get('),
  };
}

// Generate dynamic metadata function for pages that need it
export function generateDynamicMetadata(pageName: string, config: SEOConfig): string {
  const title = formatTitle(pageName);
  
  return `export async function generateMetadata({ params, searchParams }: {
  params: { [key: string]: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // You can fetch data here if needed
  // const data = await fetchData(params.id);
  
  return {
    title: \`\${params.id || '${title}'} | ${config.siteName}\`,
    description: \`${title} - ${config.siteDescription}\`,
    openGraph: {
      title: \`\${params.id || '${title}'} | ${config.siteName}\`,
      description: \`${title} - ${config.siteDescription}\`,
    },
  };
}`;
}