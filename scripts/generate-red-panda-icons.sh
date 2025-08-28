#!/bin/bash

# Script to generate all required icon sizes from the red panda image
# Requires ImageMagick (install with: paru -S imagemagick or yay -S imagemagick)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Source and destination paths
SOURCE_IMG="/home/helye/Development/Projects/Work/Nextjs/doshi-sensei/public/red-panda/red-panda.png"
PUBLIC_DIR="/home/helye/Development/Projects/Work/Nextjs/doshi-sensei/public"
ICONS_DIR="$PUBLIC_DIR/icons"

# Check if ImageMagick is installed and determine the command to use
if command -v magick &> /dev/null; then
    CONVERT_CMD="magick"
elif command -v convert &> /dev/null; then
    CONVERT_CMD="convert"
else
    echo -e "${RED}ImageMagick is not installed. Please install it first:${NC}"
    echo "paru -S imagemagick"
    exit 1
fi

# Check if source file exists
if [ ! -f "$SOURCE_IMG" ]; then
    echo -e "${RED}Source image not found: $SOURCE_IMG${NC}"
    exit 1
fi

echo -e "${GREEN}Starting red panda icon generation...${NC}"
echo "Source: $SOURCE_IMG"
echo ""

# Backup existing doshi.png
if [ -f "$PUBLIC_DIR/doshi.png" ]; then
    echo -e "${YELLOW}Backing up existing doshi.png to doshi.png.backup${NC}"
    cp "$PUBLIC_DIR/doshi.png" "$PUBLIC_DIR/doshi.png.backup"
fi

# Copy as main doshi.png (512x512 is already the right size)
echo "Creating main doshi.png..."
cp "$SOURCE_IMG" "$PUBLIC_DIR/doshi.png"

# Function to resize image
resize_icon() {
    local size=$1
    local output=$2
    echo "  Creating $output (${size}x${size})..."
    $CONVERT_CMD "$SOURCE_IMG" -resize "${size}x${size}" -background transparent -gravity center -extent "${size}x${size}" "$output"
}

# Generate favicon sizes
echo -e "\n${GREEN}Generating favicon sizes...${NC}"
resize_icon 16 "$PUBLIC_DIR/favicon-16x16.png"
resize_icon 32 "$PUBLIC_DIR/favicon-32x32.png"
resize_icon 48 "$PUBLIC_DIR/favicon-48x48.png"
resize_icon 70 "$PUBLIC_DIR/favicon-70x70.png"
resize_icon 96 "$PUBLIC_DIR/favicon-96x96.png"
resize_icon 150 "$PUBLIC_DIR/favicon-150x150.png"
resize_icon 192 "$PUBLIC_DIR/favicon-192x192.png"
resize_icon 256 "$PUBLIC_DIR/favicon-256x256.png"
resize_icon 310 "$PUBLIC_DIR/favicon-310x310.png"
resize_icon 384 "$PUBLIC_DIR/favicon-384x384.png"
resize_icon 512 "$PUBLIC_DIR/favicon-512x512.png"

# Generate Apple touch icons
echo -e "\n${GREEN}Generating Apple touch icons...${NC}"
resize_icon 120 "$PUBLIC_DIR/apple-touch-icon-120x120.png"
resize_icon 152 "$PUBLIC_DIR/apple-touch-icon-152x152.png"
resize_icon 167 "$PUBLIC_DIR/apple-touch-icon-167x167.png"
resize_icon 180 "$PUBLIC_DIR/apple-touch-icon-180x180.png"
resize_icon 1024 "$PUBLIC_DIR/apple-touch-icon-1024x1024.png"
resize_icon 180 "$PUBLIC_DIR/apple-touch-icon.png"  # Default apple-touch-icon
resize_icon 180 "$PUBLIC_DIR/apple-icon.png"  # Apple icon

# Generate Android Chrome icons
echo -e "\n${GREEN}Generating Android Chrome icons...${NC}"
resize_icon 192 "$PUBLIC_DIR/android-chrome-192x192.png"
resize_icon 512 "$PUBLIC_DIR/android-chrome-512x512.png"

# Generate PWA icons in icons folder
echo -e "\n${GREEN}Generating PWA icons...${NC}"
resize_icon 48 "$ICONS_DIR/icon-48x48.png"
resize_icon 72 "$ICONS_DIR/icon-72x72.png"
resize_icon 96 "$ICONS_DIR/icon-96x96.png"
resize_icon 128 "$ICONS_DIR/icon-128x128.png"
resize_icon 144 "$ICONS_DIR/icon-144x144.png"
resize_icon 152 "$ICONS_DIR/icon-152x152.png"
resize_icon 192 "$ICONS_DIR/icon-192x192.png"
resize_icon 384 "$ICONS_DIR/icon-384x384.png"
resize_icon 512 "$ICONS_DIR/icon-512x512.png"
resize_icon 1024 "$ICONS_DIR/icon-1024x1024.png"
resize_icon 2048 "$ICONS_DIR/icon-2048x2048.png"

# Generate maskable versions (with padding for safe area)
echo -e "\n${GREEN}Generating maskable icons...${NC}"
echo "  Creating maskable-512x512.png..."
$CONVERT_CMD "$SOURCE_IMG" -resize 409x409 -background white -gravity center -extent 512x512 "$ICONS_DIR/maskable-512x512.png"
echo "  Creating maskable-1024x1024.png..."
$CONVERT_CMD "$SOURCE_IMG" -resize 819x819 -background white -gravity center -extent 1024x1024 "$ICONS_DIR/maskable-1024x1024.png"

# Generate monochrome version
echo -e "\n${GREEN}Generating monochrome icon...${NC}"
echo "  Creating monochrome-96x96.png..."
$CONVERT_CMD "$SOURCE_IMG" -resize 96x96 -colorspace Gray "$ICONS_DIR/monochrome-96x96.png"

# Generate badge icon (smaller version for notifications)
echo -e "\n${GREEN}Generating badge icon...${NC}"
resize_icon 72 "$PUBLIC_DIR/badge-72x72.png"

# Generate special purpose icons if they don't exist
echo -e "\n${GREEN}Checking special purpose icons...${NC}"

# File handler icon
if [ ! -f "$ICONS_DIR/file-handler-96.png" ]; then
    echo "  Creating file-handler-96.png..."
    resize_icon 96 "$ICONS_DIR/file-handler-96.png"
fi

# Shortcut icons (keep existing if they exist, as they might have specific designs)
SHORTCUTS=("shortcut-practice-96" "shortcut-vocabulary-96" "shortcut-games-96" "shortcut-news-96")
for shortcut in "${SHORTCUTS[@]}"; do
    if [ ! -f "$ICONS_DIR/${shortcut}.png" ]; then
        echo "  Creating ${shortcut}.png (using red panda as placeholder)..."
        resize_icon 96 "$ICONS_DIR/${shortcut}.png"
    else
        echo "  Keeping existing ${shortcut}.png"
    fi
done

# Generate favicon.ico with multiple sizes
echo -e "\n${GREEN}Generating favicon.ico...${NC}"
$CONVERT_CMD "$SOURCE_IMG" -define icon:auto-resize=256,128,96,64,48,32,16 "$PUBLIC_DIR/favicon.ico"

echo -e "\n${GREEN}✅ Icon generation complete!${NC}"
echo ""
echo "Summary:"
echo "  - Main mascot: $PUBLIC_DIR/doshi.png"
echo "  - Favicons: Generated in $PUBLIC_DIR/"
echo "  - PWA icons: Generated in $ICONS_DIR/"
echo "  - Original backup: $PUBLIC_DIR/doshi.png.backup (if existed)"
echo ""
echo -e "${YELLOW}Note: The app will now use the red panda as the mascot!${NC}"
echo "The Lottie animation can be used for interactive components."