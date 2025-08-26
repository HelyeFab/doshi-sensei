#!/bin/bash

echo "📊 Checking Netlify Environment Variables Size..."
echo "================================================"

# Method 1: Get all env vars and calculate size
echo -e "\n📝 Method 1: Using netlify env:list"
netlify env:list --json 2>/dev/null | jq -r 'to_entries | map("\(.key)=\(.value)") | join("\n")' > /tmp/netlify-env.txt
SIZE1=$(wc -c < /tmp/netlify-env.txt)
echo "Total size: $SIZE1 bytes ($((SIZE1/1024)) KB)"

# Method 2: Manual calculation from netlify env:list
echo -e "\n📝 Method 2: Raw output size"
SIZE2=$(netlify env:list 2>/dev/null | wc -c)
echo "Raw output size: $SIZE2 bytes"

# Method 3: Get individual var sizes
echo -e "\n📝 Method 3: Individual variable sizes"
netlify env:list 2>/dev/null | grep -E "^[A-Z_]+" | while read -r line; do
    VAR_NAME=$(echo "$line" | awk '{print $1}')
    VAR_SIZE=${#line}
    echo "$VAR_NAME: $VAR_SIZE bytes"
done | sort -t: -k2 -n -r | head -20

# Method 4: Check if we're approaching the limit
echo -e "\n⚠️  Netlify Environment Variable Limits:"
echo "- Maximum size per variable: 4KB (4096 bytes)"
echo "- Total environment size limit: 4KB for all variables combined"

if [ "$SIZE1" -gt 4096 ]; then
    echo -e "\n❌ OVER LIMIT: Your variables exceed 4KB!"
    echo "   Current: $SIZE1 bytes"
    echo "   Limit:   4096 bytes"
    echo "   Over by: $((SIZE1-4096)) bytes"
else
    echo -e "\n✅ UNDER LIMIT: Your variables are within 4KB"
    echo "   Current: $SIZE1 bytes"
    echo "   Limit:   4096 bytes"
    echo "   Space left: $((4096-SIZE1)) bytes"
fi

# Clean up
rm -f /tmp/netlify-env.txt