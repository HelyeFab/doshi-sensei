#!/bin/bash

# Update Open Graph images in page files

cd /home/mate/Dev/NextProjects/doshi-sensei/src/app

# Function to update a page file
update_page() {
    local file=$1
    local og_image=$2
    
    if [ -f "$file" ]; then
        # Check if already has image parameter
        if ! grep -q "image:" "$file"; then
            # Add image parameter before the closing });
            sed -i "/path:.*,$/s/,$/,\n  image: '\/og-images\/$og_image'/" "$file"
            echo "✓ Updated $file"
        else
            echo "⚠️  $file already has image parameter"
        fi
    else
        echo "❌ $file not found"
    fi
}

echo "Updating Open Graph images in pages..."

# Update remaining pages
update_page "drill/page.tsx" "og-drill.png"
update_page "stories/page.tsx" "og-stories.png"
update_page "resources/page.tsx" "og-resources.png"
update_page "news/page.tsx" "og-news.png"
update_page "kanji-browser/page.tsx" "og-kanji.png"
update_page "kanji-moods/page.tsx" "og-kanji.png"
update_page "tools/textbook-vocabulary/page.tsx" "og-tools.png"
update_page "tools/youtube-shadowing/page.tsx" "og-tools.png"

echo "Done!"