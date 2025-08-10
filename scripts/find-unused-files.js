const fs = require('fs');
const path = require('path');

// Files and directories to ignore
const IGNORE_PATTERNS = [
  'node_modules',
  '.next',
  '.git',
  'public/sw.js',
  'public/workbox',
  '.DS_Store',
  'package-lock.json',
  'package.json',
  'tsconfig.json',
  'next.config',
  'jest.config',
  'README',
  '.env',
  '.gitignore',
  'postcss.config',
  'tailwind.config',
  'netlify',
  'firebase.json',
  'firestore',
  '.eslintrc',
  'scripts/find-unused-files.js', // This script itself
  'scripts/delete-unused-files.sh', // Deletion script
  '.vscode',
  '.idea',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
  'docs/', // Documentation
  'CLAUDE.md' // Claude Code docs
];

// File extensions to check
const CHECK_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.module.css', '.module.scss'];

// Config files that might reference other files
const CONFIG_FILES = [
  'next.config.js',
  'next.config.mjs',
  'tailwind.config.js',
  'tailwind.config.ts',
  'postcss.config.js',
  'jest.config.js',
  'vitest.config.js',
  'webpack.config.js',
  '.eslintrc.js',
  '.prettierrc.js'
];

// Get all files in a directory recursively
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    
    // Skip ignored patterns
    if (IGNORE_PATTERNS.some(pattern => filePath.includes(pattern))) {
      return;
    }

    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

// Check if file is referenced in configuration files
function isUsedInConfig(filePath) {
  const fileName = path.basename(filePath);
  const filePathFromRoot = filePath.replace(/^\.\//, '');
  
  for (const configFile of CONFIG_FILES) {
    if (fs.existsSync(configFile)) {
      try {
        const content = fs.readFileSync(configFile, 'utf8');
        // Check if the file path or name appears in config
        if (content.includes(fileName) || 
            content.includes(filePathFromRoot) ||
            content.includes(filePathFromRoot.replace(/\\/g, '/'))) {
          return true;
        }
      } catch (e) {
        // Skip if can't read
      }
    }
  }
  
  return false;
}

// Check if file is referenced in environment files
function isUsedInEnvFiles(filePath) {
  const fileName = path.basename(filePath);
  const envFiles = ['.env', '.env.local', '.env.production', '.env.development'];
  
  for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
      try {
        const content = fs.readFileSync(envFile, 'utf8');
        // Check if filename appears in env values (common for API endpoints, file paths)
        if (content.includes(fileName)) {
          return true;
        }
      } catch (e) {
        // Skip if can't read
      }
    }
  }
  
  return false;
}

// Check if a file is imported/used anywhere
function isFileUsed(filePath, allFiles) {
  const fileName = path.basename(filePath);
  const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
  
  // Special cases - files that are used but not imported
  const specialFiles = [
    'globals.css', // Used in layout
    'layout.tsx', // Next.js special file
    'page.tsx', // Next.js special file
    'loading.tsx', // Next.js special file
    'error.tsx', // Next.js special file
    'not-found.tsx', // Next.js special file
    'route.ts', // API routes
    'route.js', // API routes
    'middleware.ts', // Next.js middleware
    'middleware.js', // Next.js middleware
    '_app.tsx', // Next.js app file
    '_document.tsx', // Next.js document
    'manifest.json', // PWA manifest
    'robots.txt', // SEO
    'sitemap.xml', // SEO
    'favicon.ico', // Browser icon
    'icon.png', // App icon
    'apple-icon.png', // Apple icon
    'opengraph-image', // OG images
    'twitter-image', // Twitter images
    'global.css', // Global styles variant
    'app.css', // App styles
    'index.css', // Index styles
    'sw.js', // Service worker
    'service-worker.js', // Service worker variant
    'browserconfig.xml', // Windows tiles
    'site.webmanifest', // Web manifest
    '.nojekyll', // GitHub pages
    'CNAME', // GitHub pages domain
    'vercel.json', // Vercel config
    'netlify.toml', // Netlify config
  ];

  if (specialFiles.some(special => fileName.includes(special))) {
    return true;
  }

  // Check if file is in public folder (assets)
  if (filePath.includes('/public/')) {
    const publicPath = filePath.split('/public/')[1];
    
    // Check if this public file is referenced anywhere
    for (const file of allFiles) {
      if (file === filePath) continue;
      if (!CHECK_EXTENSIONS.some(ext => file.endsWith(ext))) continue;
      
      try {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes(publicPath) || 
            content.includes(publicPath.replace(/\\/g, '/')) ||
            content.includes(`/${publicPath}`)) {
          return true;
        }
      } catch (e) {
        // Skip files that can't be read
      }
    }
    return false;
  }

  // For source files, check imports
  if (CHECK_EXTENSIONS.some(ext => filePath.endsWith(ext))) {
    // Check if this file is imported anywhere
    for (const file of allFiles) {
      if (file === filePath) continue;
      if (!CHECK_EXTENSIONS.some(ext => file.endsWith(ext))) continue;
      
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check various import patterns
        const importPatterns = [
          // ES6 imports
          `from './${fileNameWithoutExt}'`,
          `from "./${fileNameWithoutExt}"`,
          `from '${fileNameWithoutExt}'`,
          `from "${fileNameWithoutExt}"`,
          `from './${fileNameWithoutExt}.`,
          `from "./${fileNameWithoutExt}.`,
          
          // Dynamic imports
          `import('./${fileNameWithoutExt}')`,
          `import("./${fileNameWithoutExt}")`,
          `import('${fileNameWithoutExt}')`,
          `import("${fileNameWithoutExt}")`,
          `import('./${fileNameWithoutExt}.`,
          `import("./${fileNameWithoutExt}.`,
          
          // CommonJS require
          `require('./${fileNameWithoutExt}')`,
          `require("./${fileNameWithoutExt}")`,
          `require('${fileNameWithoutExt}')`,
          `require("${fileNameWithoutExt}")`,
          `require('./${fileNameWithoutExt}.`,
          `require("./${fileNameWithoutExt}.`,
          
          // Path aliases
          `from '@/${fileNameWithoutExt}`,
          `from "@/${fileNameWithoutExt}`,
          `import('@/${fileNameWithoutExt}`,
          `import("@/${fileNameWithoutExt}`,
          
          // CSS imports
          `@import '${fileNameWithoutExt}`,
          `@import "${fileNameWithoutExt}`,
          `@import url('${fileNameWithoutExt}`,
          `@import url("${fileNameWithoutExt}`,
          
          // Other references
          `/${fileNameWithoutExt}'`,
          `/${fileNameWithoutExt}"`,
          `/${fileNameWithoutExt}\``,
          fileNameWithoutExt + '.',
          fileNameWithoutExt + '"',
          fileNameWithoutExt + "'",
          fileNameWithoutExt + '`',
        ];
        
        if (importPatterns.some(pattern => content.includes(pattern))) {
          return true;
        }
        
        // Check relative paths
        const relativePath = path.relative(path.dirname(file), filePath).replace(/\\/g, '/');
        const relativePathNoExt = relativePath.replace(/\.[^/.]+$/, '');
        
        if (content.includes(relativePath) || content.includes(relativePathNoExt)) {
          return true;
        }
        
        // Check for full path references (common in Next.js)
        const fullPathPatterns = [
          `@/components/${fileNameWithoutExt}`,
          `@/hooks/${fileNameWithoutExt}`,
          `@/utils/${fileNameWithoutExt}`,
          `@/lib/${fileNameWithoutExt}`,
          `@/styles/${fileNameWithoutExt}`,
          `@/types/${fileNameWithoutExt}`,
          `@/services/${fileNameWithoutExt}`,
          `@/config/${fileNameWithoutExt}`,
        ];
        
        if (fullPathPatterns.some(pattern => content.includes(pattern))) {
          return true;
        }
        
        // Check if file path is constructed dynamically
        const pathParts = filePath.split('/');
        if (pathParts.length > 2) {
          const folder = pathParts[pathParts.length - 2];
          if (content.includes(`${folder}/${fileNameWithoutExt}`) ||
              content.includes(`${folder}\\${fileNameWithoutExt}`)) {
            return true;
          }
        }
      } catch (e) {
        // Skip files that can't be read
      }
    }
  }

  return false;
}

// Main function
function findUnusedFiles() {
  console.log('🔍 Scanning project for unused files...\n');
  console.log('Checking for:');
  console.log('  ✓ ES6/CommonJS imports');
  console.log('  ✓ Dynamic imports');
  console.log('  ✓ CSS @import statements');
  console.log('  ✓ Path aliases (@/ references)');
  console.log('  ✓ Configuration file references');
  console.log('  ✓ Environment variable references');
  console.log('  ✓ Public asset references\n');
  
  const startTime = Date.now();
  const allFiles = getAllFiles('.');
  const unusedFiles = [];
  let checkedCount = 0;
  
  for (const file of allFiles) {
    // Only check certain file types
    const shouldCheck = CHECK_EXTENSIONS.some(ext => file.endsWith(ext)) || 
                       file.includes('/public/');
    
    if (!shouldCheck) continue;
    
    checkedCount++;
    
    // Check multiple sources for file usage
    if (!isFileUsed(file, allFiles) && !isUsedInConfig(file) && !isUsedInEnvFiles(file)) {
      unusedFiles.push(file);
    }
  }
  
  // Group by directory
  const grouped = {};
  unusedFiles.forEach(file => {
    const dir = path.dirname(file);
    if (!grouped[dir]) grouped[dir] = [];
    grouped[dir].push(path.basename(file));
  });
  
  // Sort directories for consistent output
  const sortedDirs = Object.keys(grouped).sort();
  
  console.log(`\n📊 Results:`);
  console.log(`  Total files scanned: ${checkedCount}`);
  console.log(`  Unused files found: ${unusedFiles.length}`);
  console.log(`  Time taken: ${(Date.now() - startTime) / 1000}s\n`);
  
  if (unusedFiles.length === 0) {
    console.log('✨ No unused files found! Your project is clean.');
    return;
  }
  
  console.log('🗑️  Unused files by directory:\n');
  
  sortedDirs.forEach(dir => {
    const files = grouped[dir];
    console.log(`${dir}/`);
    files.sort().forEach(file => {
      const ext = path.extname(file);
      let icon = '📄';
      if (ext === '.tsx' || ext === '.jsx') icon = '⚛️ ';
      else if (ext === '.ts' || ext === '.js') icon = '📜';
      else if (ext === '.css' || ext === '.scss') icon = '🎨';
      else if (file.includes('test')) icon = '🧪';
      console.log(`  ${icon} ${file}`);
    });
    console.log('');
  });
  
  // Show summary by type
  const byType = {
    components: unusedFiles.filter(f => f.includes('/components/')),
    hooks: unusedFiles.filter(f => f.includes('/hooks/')),
    utils: unusedFiles.filter(f => f.includes('/utils/')),
    tests: unusedFiles.filter(f => f.includes('test') || f.includes('__tests__')),
    styles: unusedFiles.filter(f => f.endsWith('.css') || f.endsWith('.scss')),
    public: unusedFiles.filter(f => f.includes('/public/')),
  };
  
  console.log('📈 Summary by type:');
  Object.entries(byType).forEach(([type, files]) => {
    if (files.length > 0) {
      console.log(`  ${type}: ${files.length} files`);
    }
  });
  
  console.log('\n💡 To delete these files, review and run: ./scripts/delete-unused-files.sh');
  console.log('⚠️  Always review the list carefully before deleting!');
}

findUnusedFiles();