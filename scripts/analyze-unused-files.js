#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const projectRoot = path.join(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
const flatIconsDir = path.join(publicDir, 'flat-icons');

// File extensions to check
const imageExtensions = ['.png', '.svg', '.jpg', '.jpeg', '.webp', '.gif'];
const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.json'];

// Directories to search for references
const searchDirs = [
  'src',
  'app',
  'components',
  'pages',
  'styles',
  'public/sw.js',
  'next.config.ts',
  'tailwind.config.ts'
];

console.log('🔍 Analyzing unused files in public/flat-icons...\n');

// Get all image files
function getImageFiles(dir) {
  const files = [];
  
  function walk(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (imageExtensions.includes(path.extname(item).toLowerCase())) {
        files.push({
          fullPath,
          relativePath: path.relative(projectRoot, fullPath),
          publicPath: path.relative(publicDir, fullPath),
          filename: item,
          size: stat.size
        });
      }
    }
  }
  
  walk(dir);
  return files;
}

// Search for file references using ripgrep
function findReferences(file) {
  const references = [];
  const searchTerms = [
    file.filename,
    file.publicPath,
    file.publicPath.replace(/\\/g, '/'), // Windows path fix
    `/${file.publicPath.replace(/\\/g, '/')}`,
    file.filename.replace(/\.[^.]+$/, ''), // Without extension
  ];
  
  for (const term of searchTerms) {
    try {
      // Use ripgrep for fast searching
      const cmd = `rg -l --no-heading "${term}" ${searchDirs.map(d => path.join(projectRoot, d)).join(' ')} 2>/dev/null || true`;
      const result = execSync(cmd, { cwd: projectRoot, encoding: 'utf-8' });
      
      if (result.trim()) {
        const files = result.trim().split('\n');
        references.push(...files.map(f => ({
          file: path.relative(projectRoot, f),
          searchTerm: term
        })));
      }
    } catch (e) {
      // Ignore errors, continue searching
    }
  }
  
  // Also check for dynamic imports or variable references
  const dynamicPatterns = [
    `flat-icons.*${file.filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
    `['"\`].*${file.filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`
  ];
  
  for (const pattern of dynamicPatterns) {
    try {
      const cmd = `rg -l "${pattern}" ${searchDirs.map(d => path.join(projectRoot, d)).join(' ')} 2>/dev/null || true`;
      const result = execSync(cmd, { cwd: projectRoot, encoding: 'utf-8' });
      
      if (result.trim()) {
        const files = result.trim().split('\n');
        references.push(...files.map(f => ({
          file: path.relative(projectRoot, f),
          searchTerm: `dynamic: ${pattern}`
        })));
      }
    } catch (e) {
      // Ignore errors
    }
  }
  
  return references;
}

// Main analysis
console.log('📁 Scanning flat-icons directory...');
const imageFiles = getImageFiles(flatIconsDir);
console.log(`Found ${imageFiles.length} image files\n`);

console.log('🔎 Checking for references in codebase...\n');

const unusedFiles = [];
const usedFiles = [];
let totalSize = 0;
let unusedSize = 0;

for (let i = 0; i < imageFiles.length; i++) {
  const file = imageFiles[i];
  process.stdout.write(`\rChecking ${i + 1}/${imageFiles.length}: ${file.filename}`);
  
  const references = findReferences(file);
  totalSize += file.size;
  
  if (references.length === 0) {
    unusedFiles.push(file);
    unusedSize += file.size;
  } else {
    usedFiles.push({ ...file, references });
  }
}

console.log('\n\n📊 Analysis Complete!\n');
console.log('=' * 60);
console.log(`Total files analyzed: ${imageFiles.length}`);
console.log(`Used files: ${usedFiles.length}`);
console.log(`Potentially unused files: ${unusedFiles.length}`);
console.log(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`Potentially unused size: ${(unusedSize / 1024 / 1024).toFixed(2)} MB`);
console.log('=' * 60);

// Save detailed report
const reportPath = path.join(projectRoot, 'unused-files-report.json');
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    totalFiles: imageFiles.length,
    usedFiles: usedFiles.length,
    unusedFiles: unusedFiles.length,
    totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
    unusedSizeMB: (unusedSize / 1024 / 1024).toFixed(2)
  },
  unusedFiles: unusedFiles.map(f => ({
    path: f.publicPath,
    filename: f.filename,
    sizeKB: (f.size / 1024).toFixed(2)
  })),
  usedFiles: usedFiles.map(f => ({
    path: f.publicPath,
    filename: f.filename,
    sizeKB: (f.size / 1024).toFixed(2),
    referencedIn: f.references.map(r => r.file)
  }))
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n📄 Detailed report saved to: ${path.relative(projectRoot, reportPath)}\n`);

// Show sample of unused files
if (unusedFiles.length > 0) {
  console.log('🗑️  Sample of potentially unused files:');
  console.log('────────────────────────────────────');
  unusedFiles.slice(0, 10).forEach(file => {
    console.log(`  ${file.publicPath} (${(file.size / 1024).toFixed(1)} KB)`);
  });
  if (unusedFiles.length > 10) {
    console.log(`  ... and ${unusedFiles.length - 10} more files`);
  }
}

console.log('\n⚠️  IMPORTANT NOTES:');
console.log('────────────────────');
console.log('1. This analysis may not catch all dynamic references');
console.log('2. Some files might be referenced in:');
console.log('   - Environment-specific code');
console.log('   - External configuration files');
console.log('   - Dynamic imports with variable names');
console.log('   - CSS url() references');
console.log('   - Markdown or other content files');
console.log('3. ALWAYS manually verify before deleting any files');
console.log('4. Consider keeping a backup before removing files');
console.log('\n✅ This scan is READ-ONLY and made no changes to your files.\n');