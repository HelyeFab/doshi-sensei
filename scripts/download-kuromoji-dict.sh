#!/bin/bash

# Create dict directory
mkdir -p public/dict

# Download dictionary files using curl
echo "Downloading Kuromoji dictionary files..."

BASE_URL="https://unpkg.com/kuromoji@0.1.2/dict"
FILES=(
  "base.dat.gz"
  "cc.dat.gz"
  "check.dat.gz"
  "tid.dat.gz"
  "tid_map.dat.gz"
  "tid_pos.dat.gz"
  "unk.dat.gz"
  "unk_char.dat.gz"
  "unk_compat.dat.gz"
  "unk_invoke.dat.gz"
  "unk_map.dat.gz"
  "unk_pos.dat.gz"
)

for file in "${FILES[@]}"; do
  if [ -f "public/dict/$file" ] && [ -s "public/dict/$file" ]; then
    echo "✓ $file already exists"
  else
    echo "Downloading $file..."
    curl -L -o "public/dict/$file" "$BASE_URL/$file"
    if [ $? -eq 0 ]; then
      echo "✓ Downloaded $file"
    else
      echo "✗ Failed to download $file"
      exit 1
    fi
  fi
done

echo ""
echo "✅ Kuromoji dictionary setup complete!"
echo "Dictionary files are in: public/dict/"