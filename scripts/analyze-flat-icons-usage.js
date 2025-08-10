#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.join(__dirname, '..');
const flatIconsDir = path.join(projectRoot, 'public/flat-icons');

console.log('🔍 Flat Icons Usage Analysis\n');
console.log('=' * 60);

// Get all subdirectories in flat-icons
function getIconSets() {
  const sets = [];
  const items = fs.readdirSync(flatIconsDir);
  
  for (const item of items) {
    const fullPath = path.join(flatIconsDir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      sets.push({
        name: item,
        path: fullPath,
        files: []
      });
    }
  }
  
  return sets;
}

// Get all icon files in a set
function getIconFiles(setPath) {
  const files = [];
  
  function walk(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (['.png', '.svg'].includes(path.extname(item).toLowerCase())) {
        files.push({
          name: item,
          path: fullPath,
          relativePath: path.relative(projectRoot, fullPath),
          size: stat.size
        });
      }
    }
  }
  
  walk(setPath);
  return files;
}

// Search for references to an icon
function findIconReferences(iconFile) {
  const references = [];
  const searchTerms = [
    iconFile.name,
    path.basename(iconFile.name, path.extname(iconFile.name)), // without extension
    iconFile.relativePath.replace(/\\/g, '/'),
    `flat-icons/${path.relative(flatIconsDir, iconFile.path).replace(/\\/g, '/')}`
  ];
  
  for (const term of searchTerms) {
    try {
      const cmd = `rg -l "${term}" src public/*.js public/*.ts *.config.* 2>/dev/null || true`;
      const result = execSync(cmd, { cwd: projectRoot, encoding: 'utf-8' });
      
      if (result.trim()) {
        result.trim().split('\n').forEach(file => {
          references.push({
            file: path.relative(projectRoot, file),
            searchTerm: term
          });
        });
      }
    } catch (e) {
      // Continue
    }
  }
  
  return references;
}

// Analyze each icon set
const iconSets = getIconSets();
console.log(`Found ${iconSets.length} icon sets in flat-icons/\n`);

const summary = {
  totalSets: iconSets.length,
  totalIcons: 0,
  totalSize: 0,
  usedIcons: 0,
  unusedIcons: 0,
  unusedSize: 0,
  setDetails: []
};

for (const set of iconSets) {
  console.log(`\n📁 Analyzing ${set.name}...`);
  
  const icons = getIconFiles(set.path);
  const setSize = icons.reduce((sum, icon) => sum + icon.size, 0);
  
  let usedCount = 0;
  let unusedCount = 0;
  let unusedSize = 0;
  const unusedIcons = [];
  const usedIcons = [];
  
  for (const icon of icons) {
    const refs = findIconReferences(icon);
    if (refs.length === 0) {
      unusedCount++;
      unusedSize += icon.size;
      unusedIcons.push(icon);
    } else {
      usedCount++;
      usedIcons.push({ ...icon, references: refs });
    }
  }
  
  const setInfo = {
    name: set.name,
    totalIcons: icons.length,
    totalSizeMB: (setSize / 1024 / 1024).toFixed(2),
    usedIcons: usedCount,
    unusedIcons: unusedCount,
    unusedSizeMB: (unusedSize / 1024 / 1024).toFixed(2),
    unusedFiles: unusedIcons.map(i => ({
      name: i.name,
      path: i.relativePath,
      sizeKB: (i.size / 1024).toFixed(2)
    })),
    usedFiles: usedIcons.map(i => ({
      name: i.name,
      path: i.relativePath,
      referencedIn: i.references.map(r => r.file)
    }))
  };
  
  // Update summary
  summary.totalIcons += icons.length;
  summary.totalSize += setSize;
  summary.usedIcons += usedCount;
  summary.unusedIcons += unusedCount;
  summary.unusedSize += unusedSize;
  summary.setDetails.push(setInfo);
  
  // Print set summary
  console.log(`   Total: ${icons.length} icons (${(setSize / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`   Used: ${usedCount} icons`);
  console.log(`   Unused: ${unusedCount} icons (${(unusedSize / 1024 / 1024).toFixed(2)} MB)`);
  
  if (unusedCount > 0 && unusedCount <= 5) {
    console.log('   Unused files:');
    unusedIcons.forEach(icon => {
      console.log(`     - ${icon.name} (${(icon.size / 1024).toFixed(1)} KB)`);
    });
  } else if (unusedCount > 5) {
    console.log(`   Sample unused files:`);
    unusedIcons.slice(0, 3).forEach(icon => {
      console.log(`     - ${icon.name} (${(icon.size / 1024).toFixed(1)} KB)`);
    });
    console.log(`     ... and ${unusedCount - 3} more`);
  }
}

// Print overall summary
console.log('\n' + '=' * 60);
console.log('📊 OVERALL SUMMARY');
console.log('=' * 60);
console.log(`Total icon sets: ${summary.totalSets}`);
console.log(`Total icons: ${summary.totalIcons}`);
console.log(`Total size: ${(summary.totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`Used icons: ${summary.usedIcons} (${((summary.usedIcons / summary.totalIcons) * 100).toFixed(1)}%)`);
console.log(`Unused icons: ${summary.unusedIcons} (${((summary.unusedIcons / summary.totalIcons) * 100).toFixed(1)}%)`);
console.log(`Potential savings: ${(summary.unusedSize / 1024 / 1024).toFixed(2)} MB`);

// Save detailed report
const reportPath = path.join(projectRoot, 'flat-icons-usage-report.json');
fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
console.log(`\n📄 Detailed report saved to: ${path.relative(projectRoot, reportPath)}`);

// Create cleanup script for flat-icons
const cleanupScriptPath = path.join(projectRoot, 'cleanup-unused-flat-icons.sh');
let cleanupScript = `#!/bin/bash
# Cleanup script for unused flat-icons
# Generated: ${new Date().toISOString()}

BACKUP_DIR=".flat-icons-backup"
mkdir -p "$BACKUP_DIR"

echo "🗑️  Flat Icons Cleanup Script"
echo "============================"
echo ""
echo "This will move unused icons to: $BACKUP_DIR"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 1
fi

echo ""
`;

// Add commands to move unused icons
for (const set of summary.setDetails) {
  if (set.unusedIcons > 0) {
    cleanupScript += `\n# ${set.name} (${set.unusedIcons} unused icons)\n`;
    set.unusedFiles.forEach(file => {
      cleanupScript += `mkdir -p "$BACKUP_DIR/$(dirname "${file.path}")" && mv "${file.path}" "$BACKUP_DIR/${file.path}" 2>/dev/null || true\n`;
    });
  }
}

cleanupScript += `
echo ""
echo "✅ Done! Unused icons moved to: $BACKUP_DIR"
echo ""
echo "To restore: cp -r $BACKUP_DIR/* ."
echo "To delete backup: rm -rf $BACKUP_DIR"
`;

fs.writeFileSync(cleanupScriptPath, cleanupScript);
fs.chmodSync(cleanupScriptPath, '755');

console.log(`\n🧹 Cleanup script created: ${path.relative(projectRoot, cleanupScriptPath)}`);
console.log('\n✅ Analysis complete!');