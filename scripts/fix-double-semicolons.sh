#!/bin/bash

# Fix double semicolons in SmartNavigationLink imports
find src/ -name "*.tsx" -type f -exec sed -i "s/SmartNavigationLink';;/SmartNavigationLink';/g" {} +

echo "Fixed double semicolons in SmartNavigationLink imports"