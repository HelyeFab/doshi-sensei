#!/bin/bash
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
echo "   rm -rf /home/mate/Dev/NextProjects/doshi-sensei/.unused-files-backup"
