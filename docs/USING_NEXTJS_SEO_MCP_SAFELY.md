# Using nextjs-seo-mcp Tool Safely

## Overview

The nextjs-seo-mcp is a powerful SEO automation tool, but it can break existing Next.js applications if not used carefully. This guide explains how to use it safely with your existing codebase.

## Understanding the Tool's Behavior

### What the Tool Does

1. **Analyzes** your Next.js project structure
2. **Identifies** missing SEO elements
3. **Automatically modifies** files to add SEO improvements
4. **Creates** new SEO-related files (sitemap, robots.txt)

### The Critical Issue

The tool doesn't properly distinguish between Client and Server Components in Next.js App Router, leading to:

- Adding `export const metadata` to Client Components (causes build errors)
- Converting Client Components to Server Components (breaks functionality)
- Creating incomplete migrations

## Safe Usage Strategy

### 1. Analysis-Only Mode First

Always start with analysis mode to understand what changes will be made:

```bash
node /path/to/nextjs-seo-mcp/dist/index.js optimize-seo \
  --projectPath /path/to/your/project \
  --config ./seo-config.json \
  --mode analyze
```

### 2. Manual Pre-Migration

Before running the tool, manually prepare your codebase:

#### Step 1: Identify Client Components

```bash
# Find all Client Components
grep -r "use client" src/app --include="*.tsx" --include="*.jsx"
```

#### Step 2: Pre-Split Components

For each Client Component page, manually create the structure:

```bash
# Original: src/app/feature/page.tsx (with 'use client')

# Create new structure:
mkdir -p src/app/feature/components
mv src/app/feature/page.tsx src/app/feature/components/FeatureClient.tsx

# Create new Server Component page.tsx
cat > src/app/feature/page.tsx << 'EOF'
import FeatureClient from './components/FeatureClient';

// Temporary placeholder - MCP will add metadata here
export default function FeaturePage() {
  return <FeatureClient />;
}
EOF
```

### 3. Selective Tool Usage

Instead of running the tool on the entire project, use it selectively:

#### Option A: Generate Files Only

Use the tool just for generating SEO files:

```bash
# Generate sitemap only
node /path/to/nextjs-seo-mcp/dist/index.js generate-sitemap \
  --projectPath /path/to/your/project \
  --siteUrl https://yoursite.com

# Generate robots.txt only
node /path/to/nextjs-seo-mcp/dist/index.js generate-robots \
  --projectPath /path/to/your/project \
  --siteUrl https://yoursite.com
```

#### Option B: Create a Temporary Project

1. Create a minimal Next.js project with Server Components only
2. Run the MCP tool on it
3. Copy the generated patterns to your real project

```bash
# Create temporary project
npx create-next-app@latest temp-seo --typescript --app
cd temp-seo

# Run MCP tool
node /path/to/nextjs-seo-mcp/dist/index.js optimize-seo \
  --projectPath . \
  --config ../your-seo-config.json

# Study the changes and apply manually to your project
```

### 4. Configuration for Safety

Create a configuration that minimizes automatic changes:

```json
{
  "siteName": "Your Site",
  "siteDescription": "Your description",
  "siteUrl": "https://yoursite.com",
  "targetKeywords": ["keyword1", "keyword2"],
  "mode": "minimal",
  "skipClientComponents": true,
  "preserveExisting": true
}
```

Note: These options don't exist in the current MCP but illustrate what would make it safer.

## Recommended Workflow

### Phase 1: Information Gathering

1. Run analysis mode
2. Export the analysis results
3. Create a manual implementation plan

```bash
# Run analysis and save results
node /path/to/nextjs-seo-mcp/dist/index.js analyze-seo \
  --projectPath . > seo-analysis.txt

# Run audit for detailed information
node /path/to/nextjs-seo-mcp/dist/index.js seo-audit \
  --projectPath . \
  --detailed true > seo-audit.txt
```

### Phase 2: Manual Implementation

Based on the analysis, manually implement SEO improvements:

1. **Add metadata to Server Components only**
2. **Create wrapper Server Components where needed**
3. **Add structured data manually**
4. **Test after each change**

### Phase 3: Use MCP for Non-Breaking Features

Use the MCP tool only for features that won't break your code:

```bash
# Generate sitemap (safe)
node /path/to/nextjs-seo-mcp/dist/index.js generate-sitemap \
  --projectPath . \
  --siteUrl https://yoursite.com

# Generate robots.txt (safe)
node /path/to/nextjs-seo-mcp/dist/index.js generate-robots \
  --projectPath . \
  --siteUrl https://yoursite.com
```

## Creating a Custom Wrapper Script

Create a safer wrapper around the MCP tool:

```javascript
// safe-seo-mcp.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function findClientComponents(projectPath) {
  const result = execSync(
    `grep -r "use client" ${projectPath}/src/app --include="*.tsx"`,
    { encoding: 'utf-8' }
  );
  return result.split('\n').filter(Boolean);
}

function safeSEOOptimize(projectPath, config) {
  // Check for client components
  const clientComponents = findClientComponents(projectPath);
  
  if (clientComponents.length > 0) {
    console.warn('⚠️  Found Client Components:');
    clientComponents.forEach(comp => console.warn(`   - ${comp}`));
    console.warn('\n❌ Cannot safely run MCP tool.');
    console.warn('Please manually migrate these components first.');
    process.exit(1);
  }
  
  // If safe, run the tool
  console.log('✅ No Client Components found. Running MCP tool...');
  execSync(`node /path/to/nextjs-seo-mcp/dist/index.js optimize-seo \
    --projectPath ${projectPath} \
    --config ${config}`, 
    { stdio: 'inherit' }
  );
}

// Usage
safeSEOOptimize('.', './seo-config.json');
```

## Recovery Plan

If the MCP tool breaks your project:

### Immediate Recovery

```bash
# If you have uncommitted changes
git status
git diff > before-mcp-changes.patch

# Revert all changes
git checkout .

# Or if you committed, revert to previous commit
git reset --hard HEAD~1
```

### Selective Recovery

If some changes are good:

```bash
# Create a new branch for MCP changes
git checkout -b mcp-changes

# Commit the MCP changes
git add .
git commit -m "MCP SEO changes"

# Go back to main branch
git checkout main

# Cherry-pick only the good changes
git cherry-pick -n <commit-hash>
# Then selectively stage only the files you want
```

## Alternative Tools and Approaches

### 1. Manual SEO Implementation

Follow the [PROPER_SEO_IMPLEMENTATION.md](./PROPER_SEO_IMPLEMENTATION.md) guide for manual implementation.

### 2. Use next-seo Package

A safer alternative that works with App Router:

```bash
npm install next-seo
```

### 3. Custom SEO Scripts

Create your own SEO generation scripts:

```javascript
// scripts/generate-seo.js
const fs = require('fs');
const path = require('path');

function generateMetadata(pageName, config) {
  return `export const metadata = {
  title: '${pageName} | ${config.siteName}',
  description: '${config.siteDescription}',
  openGraph: {
    title: '${pageName} | ${config.siteName}',
    description: '${config.siteDescription}',
  },
};`;
}

// Add metadata only to Server Components
function addMetadataToServerComponents(projectPath, config) {
  // Implementation here
}
```

## Best Practices

1. **Always backup** before running any automated tool
2. **Test in a branch** not in your main branch
3. **Run analysis first** to understand what will change
4. **Implement incrementally** rather than all at once
5. **Monitor the output** for any errors or warnings
6. **Test thoroughly** after any automated changes
7. **Have a rollback plan** before starting

## Conclusion

The nextjs-seo-mcp tool is powerful but requires careful usage with modern Next.js App Router applications. By understanding its limitations and following this guide, you can benefit from its SEO insights while maintaining your application's functionality.

Remember: No SEO improvement is worth breaking your application. Always prioritize working code over perfect SEO scores.