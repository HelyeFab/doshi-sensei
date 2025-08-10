#!/bin/bash

# Script to resize Open Graph images to 1200x630px with branding

cd /home/mate/Dev/NextProjects/doshi-sensei/public/og-images

# Create a backup directory
mkdir -p originals
cp *.png originals/ 2>/dev/null

# Brand color (Doshi Sensei purple)
BRAND_COLOR="#8a5cf6"
WHITE="#FFFFFF"

# Function to create OG image with icon
create_og_image() {
    local input_file=$1
    local output_file=$2
    local title=$3
    local subtitle=$4
    
    echo "Creating OG image: $output_file"
    
    # Create a 1200x630 canvas with brand color background
    convert -size 1200x630 xc:"$BRAND_COLOR" \
        \( "$input_file" -resize 300x300 \) \
        -gravity west -geometry +100+0 -composite \
        -fill "$WHITE" -font "DejaVu-Sans-Bold" -pointsize 72 \
        -gravity center -annotate +150-50 "$title" \
        -fill "$WHITE" -font "DejaVu-Sans" -pointsize 36 \
        -gravity center -annotate +150+50 "$subtitle" \
        -fill "$WHITE" -font "DejaVu-Sans" -pointsize 24 \
        -gravity southeast -annotate +40+20 "doshisensei.com" \
        "$output_file"
}

# Map original files to final OG images with proper titles
echo "Resizing images for Open Graph..."

# Games section
if [ -f "game-console.svg" ]; then
    convert -background none -size 300x300 game-console.svg game-console-temp.png
    create_og_image "game-console-temp.png" "og-games.png" "Japanese Learning Games" "Play fun games while learning Japanese"
    rm game-console-temp.png
elif [ -f "game-console.png" ]; then
    create_og_image "game-console.png" "og-games.png" "Japanese Learning Games" "Play fun games while learning Japanese"
fi

# Practice section (using target.png)
if [ -f "target.png" ]; then
    create_og_image "target.png" "og-practice.png" "Practice Japanese" "Master hiragana, katakana, and kanji"
fi

# Vocabulary section (using dictionary.png)
if [ -f "dictionary.png" ]; then
    create_og_image "dictionary.png" "og-vocabulary.png" "Japanese Vocabulary" "Build your vocabulary with smart flashcards"
fi

# Drill section (using cordless-drill.png)
if [ -f "cordless-drill.png" ]; then
    create_og_image "cordless-drill.png" "og-drill.png" "Conjugation Drills" "Master Japanese verb conjugations"
fi

# Stories section
if [ -f "stories.png" ]; then
    create_og_image "stories.png" "og-stories.png" "Japanese Stories" "Read engaging stories with furigana support"
fi

# Resources section (using stakeholder.png)
if [ -f "stakeholder.png" ]; then
    create_og_image "stakeholder.png" "og-resources.png" "Learning Resources" "Curated Japanese learning materials"
fi

# Kanji section
if [ -f "kanji.png" ]; then
    create_og_image "kanji.png" "og-kanji.png" "Kanji Browser" "Explore kanji with stroke orders and meanings"
fi

# Tools section (using tool-box.png)
if [ -f "tool-box.png" ]; then
    create_og_image "tool-box.png" "og-tools.png" "Japanese Learning Tools" "YouTube shadowing & textbook vocabulary"
fi

# News section (could reuse stories or create new one)
if [ -f "stories.png" ]; then
    create_og_image "stories.png" "og-news.png" "Japanese News" "Read NHK news with furigana support"
fi

echo "Done! Open Graph images created."
echo "Original images backed up in ./originals/"