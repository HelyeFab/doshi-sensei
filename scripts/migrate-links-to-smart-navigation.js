#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files to exclude from migration
const excludePatterns = [
  /\.backup\./,
  /\.test\./,
  /\.spec\./,
  /_backups\//,
  /node_modules\//,
  /\.next\//,
  /SmartNavigationLink\.tsx$/,
  /SmartPageHeader\.tsx$/,
  /NavigationContext\.tsx$/
];

// Components that should NOT be migrated (external links, auth pages, etc)
const excludeComponents = [
  'ToriiGate', 'DesktopNavMenu', 'MobileMenu', 'BottomNavigation',
  'login', 'signup', 'reset-password', 'verify-email'
];

function shouldExcludeFile(filePath) {
  return excludePatterns.some(pattern => pattern.test(filePath)) ||
         excludeComponents.some(comp => filePath.includes(comp));
}

function findTsxFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !shouldExcludeFile(fullPath)) {
      findTsxFiles(fullPath, files);
    } else if (stat.isFile() && fullPath.endsWith('.tsx') && !shouldExcludeFile(fullPath)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if file imports Link from next/link
  if (!content.includes("from 'next/link'")) {
    return null;
  }
  
  // Check if it already uses SmartNavigationLink
  if (content.includes('SmartNavigationLink')) {
    return null;
  }
  
  // Find all Link usages
  const linkRegex = /<Link\s+([^>]+)>/g;
  const matches = [...content.matchAll(linkRegex)];
  
  if (matches.length === 0) {
    return null;
  }
  
  // Analyze each Link
  const links = matches.map(match => {
    const attrs = match[1];
    const hrefMatch = attrs.match(/href=["'{]([^"'}]+)["'}]/);
    
    if (!hrefMatch) return null;
    
    const href = hrefMatch[1];
    
    // Skip external links
    if (href.startsWith('http') || href.startsWith('mailto:')) {
      return { skip: true };
    }
    
    // Skip auth-related links
    if (href.includes('login') || href.includes('signup') || href.includes('reset-password')) {
      return { skip: true };
    }
    
    return {
      fullMatch: match[0],
      href,
      attrs,
      skip: false
    };
  }).filter(Boolean);
  
  const internalLinks = links.filter(l => !l.skip);
  
  if (internalLinks.length === 0) {
    return null;
  }
  
  return {
    filePath,
    hasLink: true,
    linkCount: matches.length,
    internalLinkCount: internalLinks.length,
    links: internalLinks
  };
}

function generateMigrationReport() {
  console.log('Analyzing codebase for Link components...\n');
  
  const srcDir = path.join(process.cwd(), 'src');
  const files = findTsxFiles(srcDir);
  
  console.log(`Found ${files.length} TSX files\n`);
  
  const results = files
    .map(analyzeFile)
    .filter(Boolean)
    .sort((a, b) => b.internalLinkCount - a.internalLinkCount);
  
  console.log('Files with internal Link components that could be migrated:\n');
  
  let totalLinks = 0;
  
  results.forEach(result => {
    const relativePath = path.relative(process.cwd(), result.filePath);
    console.log(`${relativePath} - ${result.internalLinkCount} internal links`);
    totalLinks += result.internalLinkCount;
  });
  
  console.log(`\nTotal internal links to migrate: ${totalLinks}`);
  console.log(`Files to update: ${results.length}`);
  
  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      filesAnalyzed: files.length,
      filesWithLinks: results.length,
      totalInternalLinks: totalLinks
    },
    files: results.map(r => ({
      path: path.relative(process.cwd(), r.filePath),
      linkCount: r.internalLinkCount,
      links: r.links.map(l => l.href)
    }))
  };
  
  fs.writeFileSync(
    path.join(process.cwd(), 'navigation-migration-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('\nDetailed report saved to navigation-migration-report.json');
  console.log('\nTo proceed with migration, run: node scripts/migrate-links-to-smart-navigation.js --migrate');
}

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;
  
  // Add SmartNavigationLink import if needed
  if (!content.includes('SmartNavigationLink')) {
    // Find the Link import line
    const linkImportRegex = /import\s+(?:{\s*)?Link(?:\s*})?\s+from\s+['"]next\/link['"]/;
    
    if (linkImportRegex.test(content)) {
      // Add SmartNavigationLink import after Link import
      content = content.replace(linkImportRegex, match => {
        return match + "\nimport { SmartNavigationLink } from '@/components/navigation/SmartNavigationLink';";
      });
      updated = true;
    }
  }
  
  // Replace internal Link components
  const linkRegex = /<Link\s+([^>]+)>([\s\S]*?)<\/Link>/g;
  
  content = content.replace(linkRegex, (match, attrs, children) => {
    const hrefMatch = attrs.match(/href=["'{]([^"'}]+)["'}]/);
    
    if (!hrefMatch) return match;
    
    const href = hrefMatch[1];
    
    // Skip external and auth links
    if (href.startsWith('http') || href.startsWith('mailto:') || 
        href.includes('login') || href.includes('signup') || href.includes('reset-password')) {
      return match;
    }
    
    // Extract title from children if possible
    let title = 'Navigation';
    const textMatch = children.match(/^[\s]*([^<{]+)[\s]*$/);
    if (textMatch) {
      title = textMatch[1].trim();
    }
    
    // Build new SmartNavigationLink
    let newAttrs = attrs;
    
    // Add title attribute
    if (!attrs.includes('title=')) {
      newAttrs += ` title="${title}"`;
    }
    
    updated = true;
    return `<SmartNavigationLink ${newAttrs}>${children}</SmartNavigationLink>`;
  });
  
  if (updated) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  
  return false;
}

// Main execution
const args = process.argv.slice(2);

if (args.includes('--migrate')) {
  console.log('Starting Link to SmartNavigationLink migration...\n');
  
  const reportPath = path.join(process.cwd(), 'navigation-migration-report.json');
  
  if (!fs.existsSync(reportPath)) {
    console.error('No migration report found. Run without --migrate first to analyze.');
    process.exit(1);
  }
  
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  let successCount = 0;
  
  report.files.forEach(file => {
    const fullPath = path.join(process.cwd(), file.path);
    if (migrateFile(fullPath)) {
      console.log(`✅ Migrated: ${file.path}`);
      successCount++;
    } else {
      console.log(`⏭️  Skipped: ${file.path}`);
    }
  });
  
  console.log(`\n✅ Migration complete! Updated ${successCount} files.`);
} else {
  generateMigrationReport();
}