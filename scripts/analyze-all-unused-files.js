#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const projectRoot = path.join(__dirname, '..');

// Directories to analyze for unused files
const analyzeDirectories = [
  'public',
  'src/components',
  'src/utils',
  'src/hooks',
  'src/services',
  'src/lib',
  'src/contexts',
  'src/styles',
  'src/app'
];

// Directories to exclude from analysis
const excludeDirectories = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  'out',
  '.vercel',
  'coverage',
  '.firebase'
];

// File extensions to analyze
const fileExtensions = {
  images: ['.png', '.svg', '.jpg', '.jpeg', '.webp', '.gif', '.ico'],
  scripts: ['.js', '.jsx', '.ts', '.tsx'],
  styles: ['.css', '.scss', '.sass'],
  fonts: ['.ttf', '.otf', '.woff', '.woff2', '.eot'],
  data: ['.json', '.xml', '.csv'],
  media: ['.mp3', '.mp4', '.wav', '.ogg', '.webm'],
  docs: ['.pdf', '.doc', '.docx']
};

// Critical files that should never be marked as unused
const criticalFiles = [
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'next.config.ts',
  'next.config.js',
  'tailwind.config.ts',
  'tailwind.config.js',
  'postcss.config.js',
  '.env',
  '.env.local',
  '.env.production',
  '.gitignore',
  'README.md',
  'CLAUDE.md',
  'robots.txt',
  'sitemap.xml',
  'manifest.json',
  'favicon.ico',
  'apple-touch-icon.png',
  'sw.js',
  'service-worker.js'
];

// Entry points and config files that reference other files
const entryPoints = [
  'src/app/layout.tsx',
  'src/app/page.tsx',
  'src/pages/_app.tsx',
  'src/pages/_app.js',
  'src/pages/index.tsx',
  'src/pages/index.js',
  'next.config.ts',
  'next.config.js',
  'tailwind.config.ts',
  'tailwind.config.js',
  'tsconfig.json',
  'package.json'
];

console.log('🔍 Comprehensive Analysis of Potentially Unused Files\n');
console.log('Analyzing directories:', analyzeDirectories.join(', '));
console.log('=' * 80 + '\n');

// Get all files recursively
function getAllFiles(dir, baseDir = dir) {
  const files = [];
  
  function walk(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const relativePath = path.relative(projectRoot, fullPath);
        
        // Skip excluded directories
        if (excludeDirectories.some(exc => relativePath.includes(exc))) {
          continue;
        }
        
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          walk(fullPath);
        } else {
          const ext = path.extname(item).toLowerCase();
          const category = getFileCategory(ext);
          
          if (category) {
            files.push({
              fullPath,
              relativePath,
              filename: item,
              extension: ext,
              category,
              size: stat.size,
              isCritical: criticalFiles.includes(item) || criticalFiles.includes(relativePath)
            });
          }
        }
      }
    } catch (e) {
      console.error(`Error reading directory ${currentDir}:`, e.message);
    }
  }
  
  walk(dir);
  return files;
}

// Determine file category
function getFileCategory(ext) {
  for (const [category, extensions] of Object.entries(fileExtensions)) {
    if (extensions.includes(ext)) {
      return category;
    }
  }
  return null;
}

// Search for file references
function findReferences(file) {
  if (file.isCritical) {
    return [{ file: 'CRITICAL_FILE', searchTerm: 'protected' }];
  }
  
  const references = [];
  const searchTerms = new Set();
  
  // Add various ways the file might be referenced
  searchTerms.add(file.filename);
  searchTerms.add(file.relativePath);
  searchTerms.add(file.relativePath.replace(/\\/g, '/'));
  searchTerms.add(path.basename(file.filename, file.extension));
  
  // For files in public directory
  if (file.relativePath.startsWith('public/')) {
    const publicPath = file.relativePath.replace('public/', '');
    searchTerms.add(publicPath);
    searchTerms.add('/' + publicPath);
  }
  
  // For component/util files, check for import statements
  if (file.category === 'scripts') {
    const importName = path.basename(file.filename, file.extension);
    searchTerms.add(`from '.*${importName}'`);
    searchTerms.add(`from ".*${importName}"`);
    searchTerms.add(`require\\(.*${importName}`);
    searchTerms.add(`import.*${importName}`);
  }
  
  // Search for each term
  for (const term of searchTerms) {
    try {
      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const cmd = `rg -l --no-heading "${escapedTerm}" . --glob '!node_modules' --glob '!.next' --glob '!.git' --glob '!${file.relativePath}' 2>/dev/null || true`;
      const result = execSync(cmd, { cwd: projectRoot, encoding: 'utf-8', maxBuffer: 1024 * 1024 * 10 });
      
      if (result.trim()) {
        const files = result.trim().split('\n').filter(Boolean);
        references.push(...files.map(f => ({
          file: path.relative(projectRoot, f),
          searchTerm: term
        })));
      }
    } catch (e) {
      // Continue on error
    }
  }
  
  // Special handling for Next.js pages/app directory
  if (file.relativePath.includes('/app/') || file.relativePath.includes('/pages/')) {
    if (file.filename === 'page.tsx' || file.filename === 'layout.tsx' || 
        file.filename === 'error.tsx' || file.filename === 'loading.tsx' ||
        file.filename === 'not-found.tsx' || file.filename.endsWith('.page.tsx')) {
      references.push({ file: 'NEXT_JS_CONVENTION', searchTerm: 'framework' });
    }
  }
  
  return [...new Set(references.map(r => JSON.stringify(r)))].map(r => JSON.parse(r));
}

// Main analysis
const allFiles = [];
const filesByCategory = {};

console.log('📁 Scanning project directories...\n');

for (const dir of analyzeDirectories) {
  const fullPath = path.join(projectRoot, dir);
  if (fs.existsSync(fullPath)) {
    const files = getAllFiles(fullPath);
    allFiles.push(...files);
    console.log(`✓ ${dir}: ${files.length} files`);
  } else {
    console.log(`✗ ${dir}: directory not found`);
  }
}

console.log(`\nTotal files found: ${allFiles.length}\n`);

// Categorize files
for (const category of Object.keys(fileExtensions)) {
  filesByCategory[category] = allFiles.filter(f => f.category === category);
}

console.log('📊 Files by category:');
for (const [category, files] of Object.entries(filesByCategory)) {
  if (files.length > 0) {
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    console.log(`  ${category}: ${files.length} files (${(totalSize / 1024 / 1024).toFixed(2)} MB)`);
  }
}

console.log('\n🔎 Checking for references in codebase...\n');

const results = {
  used: [],
  unused: [],
  critical: []
};

let processedCount = 0;
const totalFiles = allFiles.length;

for (const file of allFiles) {
  processedCount++;
  process.stdout.write(`\rProcessing ${processedCount}/${totalFiles}: ${file.filename.padEnd(50)}`);
  
  const references = findReferences(file);
  
  if (file.isCritical) {
    results.critical.push(file);
  } else if (references.length === 0) {
    results.unused.push(file);
  } else {
    results.used.push({ ...file, references });
  }
}

console.log('\n\n' + '=' * 80);
console.log('📈 ANALYSIS RESULTS');
console.log('=' * 80);

// Summary by category
console.log('\n📦 Potentially unused files by category:\n');
const unusedByCategory = {};
let totalUnusedSize = 0;

for (const file of results.unused) {
  if (!unusedByCategory[file.category]) {
    unusedByCategory[file.category] = { files: [], totalSize: 0 };
  }
  unusedByCategory[file.category].files.push(file);
  unusedByCategory[file.category].totalSize += file.size;
  totalUnusedSize += file.size;
}

for (const [category, data] of Object.entries(unusedByCategory)) {
  console.log(`${category.toUpperCase()}:`);
  console.log(`  Files: ${data.files.length}`);
  console.log(`  Size: ${(data.totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Examples:`);
  data.files.slice(0, 3).forEach(f => {
    console.log(`    - ${f.relativePath} (${(f.size / 1024).toFixed(1)} KB)`);
  });
  if (data.files.length > 3) {
    console.log(`    ... and ${data.files.length - 3} more`);
  }
  console.log();
}

// Save detailed report
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const reportPath = path.join(projectRoot, `unused-files-analysis-${timestamp}.json`);

const report = {
  timestamp: new Date().toISOString(),
  summary: {
    totalFilesAnalyzed: allFiles.length,
    usedFiles: results.used.length,
    unusedFiles: results.unused.length,
    criticalFiles: results.critical.length,
    totalUnusedSizeMB: (totalUnusedSize / 1024 / 1024).toFixed(2),
    byCategory: Object.entries(unusedByCategory).map(([cat, data]) => ({
      category: cat,
      count: data.files.length,
      sizeMB: (data.totalSize / 1024 / 1024).toFixed(2)
    }))
  },
  unusedFiles: results.unused.map(f => ({
    path: f.relativePath,
    category: f.category,
    sizeKB: (f.size / 1024).toFixed(2)
  })).sort((a, b) => b.sizeKB - a.sizeKB),
  usedFiles: results.used.map(f => ({
    path: f.relativePath,
    category: f.category,
    referencedIn: [...new Set(f.references.map(r => r.file))]
  }))
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

// Also create a simple text list of unused files
const unusedListPath = path.join(projectRoot, `unused-files-list-${timestamp}.txt`);
const unusedList = results.unused
  .sort((a, b) => b.size - a.size)
  .map(f => `${f.relativePath} (${(f.size / 1024).toFixed(1)} KB)`)
  .join('\n');
fs.writeFileSync(unusedListPath, unusedList);

console.log('📄 Reports saved:');
console.log(`  - Full report: ${path.basename(reportPath)}`);
console.log(`  - Simple list: ${path.basename(unusedListPath)}`);

console.log('\n⚠️  CRITICAL WARNINGS:');
console.log('=' * 80);
console.log('1. This analysis may miss dynamic imports and runtime references');
console.log('2. Some "unused" files might be:');
console.log('   - Referenced in environment-specific code');
console.log('   - Used by external tools or services');
console.log('   - Required by Next.js conventions');
console.log('   - Referenced in CSS, markdown, or database content');
console.log('   - Part of a library or framework requirement');
console.log('3. NEVER delete files without manual verification');
console.log('4. Always test thoroughly after removing any files');
console.log('5. Keep backups before deleting anything');

console.log('\n✅ This analysis is READ-ONLY. No files were modified or deleted.');
console.log('\n💡 Recommendation: Start with the largest unused files and verify each one manually.\n');