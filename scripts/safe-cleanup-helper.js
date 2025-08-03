#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.join(__dirname, '..');

console.log('🔒 Safe Cleanup Helper - Zero Risk Approach\n');
console.log('This tool helps you safely identify and remove unused files.\n');

// Read the analysis report
const reportPath = path.join(projectRoot, 'unused-files-full-report.json');
if (!fs.existsSync(reportPath)) {
  console.error('❌ Please run analyze-all-unused-files.js first!');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

// Categories of files that are safest to remove
const safestCategories = [
  {
    name: 'Test/Demo Components',
    pattern: /test|demo|example|backup|old|deprecated|temp|tmp/i,
    risk: 'Very Low'
  },
  {
    name: 'Unused Icons/Images in public',
    directory: 'public',
    type: 'images',
    minSize: 10, // KB
    risk: 'Low'
  },
  {
    name: 'Orphaned Client Components',
    pattern: /Client\.tsx$/,
    risk: 'Low'
  }
];

// Step 1: Identify safest candidates
console.log('📋 Step 1: Identifying safest cleanup candidates...\n');

const candidates = [];

for (const [dir, results] of Object.entries(report.details)) {
  for (const [type, data] of Object.entries(results)) {
    if (!data.unused) continue;
    
    for (const file of data.unused) {
      // Check against safe patterns
      for (const category of safestCategories) {
        let match = false;
        
        if (category.pattern && category.pattern.test(file.path)) {
          match = true;
        } else if (category.directory === dir && category.type === type) {
          if (!category.minSize || parseFloat(file.sizeKB) >= category.minSize) {
            match = true;
          }
        }
        
        if (match) {
          candidates.push({
            path: file.path,
            sizeKB: file.sizeKB,
            category: category.name,
            risk: category.risk
          });
          break;
        }
      }
    }
  }
}

// Sort by size (largest first)
candidates.sort((a, b) => parseFloat(b.sizeKB) - parseFloat(a.sizeKB));

console.log(`Found ${candidates.length} safe cleanup candidates:\n`);

// Group by category
const byCategory = {};
for (const candidate of candidates) {
  if (!byCategory[candidate.category]) {
    byCategory[candidate.category] = [];
  }
  byCategory[candidate.category].push(candidate);
}

// Display candidates
for (const [category, files] of Object.entries(byCategory)) {
  const totalSize = files.reduce((sum, f) => sum + parseFloat(f.sizeKB), 0);
  console.log(`\n📁 ${category} (${files.length} files, ${(totalSize / 1024).toFixed(2)} MB):`);
  console.log('-'.repeat(60));
  
  // Show first 5 files as examples
  files.slice(0, 5).forEach(file => {
    console.log(`  ${file.path} (${file.sizeKB} KB)`);
  });
  
  if (files.length > 5) {
    console.log(`  ... and ${files.length - 5} more files`);
  }
}

// Step 2: Create move script
console.log('\n\n📋 Step 2: Creating safe move script...\n');

const backupDir = path.join(projectRoot, '.unused-files-backup');
const moveScriptPath = path.join(projectRoot, 'move-unused-files.sh');

let moveScript = `#!/bin/bash
# Safe move script - moves files to backup directory instead of deleting
# Generated: ${new Date().toISOString()}

BACKUP_DIR="${backupDir}"
PROJECT_ROOT="${projectRoot}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Function to safely move a file
safe_move() {
  local file="$1"
  local rel_path="\${file#$PROJECT_ROOT/}"
  local backup_path="$BACKUP_DIR/$rel_path"
  local backup_dir="$(dirname "$backup_path")"
  
  # Create directory structure in backup
  mkdir -p "$backup_dir"
  
  # Move the file
  if [ -f "$file" ]; then
    echo "Moving: $rel_path"
    mv "$file" "$backup_path"
  else
    echo "Skipped (not found): $rel_path"
  fi
}

echo "🔒 Safe File Mover"
echo "=================="
echo "This script will MOVE (not delete) files to:"
echo "$BACKUP_DIR"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 1
fi

echo ""
echo "Moving files..."
echo ""

`;

// Add move commands for each candidate
candidates.forEach(candidate => {
  const fullPath = path.join(projectRoot, candidate.path);
  moveScript += `safe_move "${fullPath}"\n`;
});

moveScript += `
echo ""
echo "✅ Done! Files moved to: $BACKUP_DIR"
echo ""
echo "To restore all files, run:"
echo "  cp -r $BACKUP_DIR/* $PROJECT_ROOT/"
echo ""
echo "To restore a specific file:"
echo "  cp $BACKUP_DIR/[path] $PROJECT_ROOT/[path]"
echo ""
echo "To permanently delete the backup:"
echo "  rm -rf $BACKUP_DIR"
`;

fs.writeFileSync(moveScriptPath, moveScript);
fs.chmodSync(moveScriptPath, '755');

// Step 3: Create validation script
console.log('📋 Step 3: Creating validation script...\n');

const validateScriptPath = path.join(projectRoot, 'validate-cleanup.sh');
const validateScript = `#!/bin/bash
# Validation script - checks if your app still works after cleanup

echo "🔍 Cleanup Validation Script"
echo "============================"
echo ""
echo "This script will help verify your app still works correctly."
echo ""

# Check 1: Build test
echo "1️⃣ Running build test..."
npm run build > /tmp/build-test.log 2>&1
if [ $? -eq 0 ]; then
  echo "   ✅ Build successful"
else
  echo "   ❌ Build failed! Check /tmp/build-test.log"
  exit 1
fi

# Check 2: Type check
echo "2️⃣ Running type check..."
npm run typecheck > /tmp/typecheck.log 2>&1
if [ $? -eq 0 ]; then
  echo "   ✅ Type check passed"
else
  echo "   ❌ Type check failed! Check /tmp/typecheck.log"
  exit 1
fi

# Check 3: Test run (if available)
if [ -f "package.json" ] && grep -q '"test"' package.json; then
  echo "3️⃣ Running tests..."
  npm test > /tmp/test.log 2>&1
  if [ $? -eq 0 ]; then
    echo "   ✅ Tests passed"
  else
    echo "   ⚠️  Tests failed (check /tmp/test.log)"
  fi
fi

echo ""
echo "✅ Basic validation complete!"
echo ""
echo "Next steps:"
echo "1. Start your dev server and manually test key features"
echo "2. Check browser console for any 404 errors"
echo "3. If everything works, you can delete the backup with:"
echo "   rm -rf ${backupDir}"
`;

fs.writeFileSync(validateScriptPath, validateScript);
fs.chmodSync(validateScriptPath, '755');

// Final instructions
console.log('\n✅ Safe cleanup helper complete!\n');
console.log('=' * 70);
console.log('Generated files:');
console.log(`  1. ${path.relative(projectRoot, moveScriptPath)} - Moves files to backup`);
console.log(`  2. ${path.relative(projectRoot, validateScriptPath)} - Validates your app`);
console.log('\n🔒 SAFE WORKFLOW:');
console.log('=' * 70);
console.log('1. Review the candidates above');
console.log('2. Run: ./move-unused-files.sh');
console.log('3. Run: ./validate-cleanup.sh');
console.log('4. Test your app manually');
console.log('5. If everything works, delete backup: rm -rf .unused-files-backup');
console.log('6. If something breaks, restore: cp -r .unused-files-backup/* .');
console.log('\n📌 The files will be MOVED, not deleted, so you can always restore them!');
console.log('\n');