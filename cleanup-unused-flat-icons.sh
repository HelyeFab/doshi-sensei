#!/bin/bash
# Cleanup script for unused flat-icons
# Generated: 2025-08-02T20:36:34.148Z

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

# 17517790-summer-watermelon (7 unused icons)
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/17517790-summer-watermelon/svg/001-happy.svg")" && mv "public/flat-icons/17517790-summer-watermelon/svg/001-happy.svg" "$BACKUP_DIR/public/flat-icons/17517790-summer-watermelon/svg/001-happy.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/17517790-summer-watermelon/svg/002-love.svg")" && mv "public/flat-icons/17517790-summer-watermelon/svg/002-love.svg" "$BACKUP_DIR/public/flat-icons/17517790-summer-watermelon/svg/002-love.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/17517790-summer-watermelon/svg/011-laugh-emoji.svg")" && mv "public/flat-icons/17517790-summer-watermelon/svg/011-laugh-emoji.svg" "$BACKUP_DIR/public/flat-icons/17517790-summer-watermelon/svg/011-laugh-emoji.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/17517790-summer-watermelon/svg/013-wow.svg")" && mv "public/flat-icons/17517790-summer-watermelon/svg/013-wow.svg" "$BACKUP_DIR/public/flat-icons/17517790-summer-watermelon/svg/013-wow.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/17517790-summer-watermelon/svg/014-angel.svg")" && mv "public/flat-icons/17517790-summer-watermelon/svg/014-angel.svg" "$BACKUP_DIR/public/flat-icons/17517790-summer-watermelon/svg/014-angel.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/17517790-summer-watermelon/svg/018-valentin-day.svg")" && mv "public/flat-icons/17517790-summer-watermelon/svg/018-valentin-day.svg" "$BACKUP_DIR/public/flat-icons/17517790-summer-watermelon/svg/018-valentin-day.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/17517790-summer-watermelon/svg/020-ok.svg")" && mv "public/flat-icons/17517790-summer-watermelon/svg/020-ok.svg" "$BACKUP_DIR/public/flat-icons/17517790-summer-watermelon/svg/020-ok.svg" 2>/dev/null || true

# 1752632-pokemon (8 unused icons)
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/1752632-pokemon/png/017-gaming.png")" && mv "public/flat-icons/1752632-pokemon/png/017-gaming.png" "$BACKUP_DIR/public/flat-icons/1752632-pokemon/png/017-gaming.png" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/1752632-pokemon/png/019-gaming.png")" && mv "public/flat-icons/1752632-pokemon/png/019-gaming.png" "$BACKUP_DIR/public/flat-icons/1752632-pokemon/png/019-gaming.png" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/1752632-pokemon/png/025-gaming.png")" && mv "public/flat-icons/1752632-pokemon/png/025-gaming.png" "$BACKUP_DIR/public/flat-icons/1752632-pokemon/png/025-gaming.png" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/1752632-pokemon/png/028-gaming.png")" && mv "public/flat-icons/1752632-pokemon/png/028-gaming.png" "$BACKUP_DIR/public/flat-icons/1752632-pokemon/png/028-gaming.png" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/1752632-pokemon/png/030-gaming.png")" && mv "public/flat-icons/1752632-pokemon/png/030-gaming.png" "$BACKUP_DIR/public/flat-icons/1752632-pokemon/png/030-gaming.png" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/1752632-pokemon/png/035-gaming.png")" && mv "public/flat-icons/1752632-pokemon/png/035-gaming.png" "$BACKUP_DIR/public/flat-icons/1752632-pokemon/png/035-gaming.png" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/1752632-pokemon/png/040-gaming.png")" && mv "public/flat-icons/1752632-pokemon/png/040-gaming.png" "$BACKUP_DIR/public/flat-icons/1752632-pokemon/png/040-gaming.png" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/1752632-pokemon/png/055-gaming.png")" && mv "public/flat-icons/1752632-pokemon/png/055-gaming.png" "$BACKUP_DIR/public/flat-icons/1752632-pokemon/png/055-gaming.png" 2>/dev/null || true

# 188915-pokemon-go (5 unused icons)
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/188915-pokemon-go/png/map.png")" && mv "public/flat-icons/188915-pokemon-go/png/map.png" "$BACKUP_DIR/public/flat-icons/188915-pokemon-go/png/map.png" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/188915-pokemon-go/png/pokeball.png")" && mv "public/flat-icons/188915-pokemon-go/png/pokeball.png" "$BACKUP_DIR/public/flat-icons/188915-pokemon-go/png/pokeball.png" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/188915-pokemon-go/png/pokedex.png")" && mv "public/flat-icons/188915-pokemon-go/png/pokedex.png" "$BACKUP_DIR/public/flat-icons/188915-pokemon-go/png/pokedex.png" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/188915-pokemon-go/png/smartphone.png")" && mv "public/flat-icons/188915-pokemon-go/png/smartphone.png" "$BACKUP_DIR/public/flat-icons/188915-pokemon-go/png/smartphone.png" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/188915-pokemon-go/png/star.png")" && mv "public/flat-icons/188915-pokemon-go/png/star.png" "$BACKUP_DIR/public/flat-icons/188915-pokemon-go/png/star.png" 2>/dev/null || true

# 4193242-animals (12 unused icons)
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/4193242-animals/svg/002-buffalo.svg")" && mv "public/flat-icons/4193242-animals/svg/002-buffalo.svg" "$BACKUP_DIR/public/flat-icons/4193242-animals/svg/002-buffalo.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/4193242-animals/svg/003-flamingo.svg")" && mv "public/flat-icons/4193242-animals/svg/003-flamingo.svg" "$BACKUP_DIR/public/flat-icons/4193242-animals/svg/003-flamingo.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/4193242-animals/svg/004-sheep.svg")" && mv "public/flat-icons/4193242-animals/svg/004-sheep.svg" "$BACKUP_DIR/public/flat-icons/4193242-animals/svg/004-sheep.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/4193242-animals/svg/005-horse.svg")" && mv "public/flat-icons/4193242-animals/svg/005-horse.svg" "$BACKUP_DIR/public/flat-icons/4193242-animals/svg/005-horse.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/4193242-animals/svg/006-cow.svg")" && mv "public/flat-icons/4193242-animals/svg/006-cow.svg" "$BACKUP_DIR/public/flat-icons/4193242-animals/svg/006-cow.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/4193242-animals/svg/007-pig.svg")" && mv "public/flat-icons/4193242-animals/svg/007-pig.svg" "$BACKUP_DIR/public/flat-icons/4193242-animals/svg/007-pig.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/4193242-animals/svg/008-hedgehog.svg")" && mv "public/flat-icons/4193242-animals/svg/008-hedgehog.svg" "$BACKUP_DIR/public/flat-icons/4193242-animals/svg/008-hedgehog.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/4193242-animals/svg/010-rabbit.svg")" && mv "public/flat-icons/4193242-animals/svg/010-rabbit.svg" "$BACKUP_DIR/public/flat-icons/4193242-animals/svg/010-rabbit.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/4193242-animals/svg/015-alpaca.svg")" && mv "public/flat-icons/4193242-animals/svg/015-alpaca.svg" "$BACKUP_DIR/public/flat-icons/4193242-animals/svg/015-alpaca.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/4193242-animals/svg/019-llama.svg")" && mv "public/flat-icons/4193242-animals/svg/019-llama.svg" "$BACKUP_DIR/public/flat-icons/4193242-animals/svg/019-llama.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/4193242-animals/svg/020-goat.svg")" && mv "public/flat-icons/4193242-animals/svg/020-goat.svg" "$BACKUP_DIR/public/flat-icons/4193242-animals/svg/020-goat.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/4193242-animals/svg/026-squirrel.svg")" && mv "public/flat-icons/4193242-animals/svg/026-squirrel.svg" "$BACKUP_DIR/public/flat-icons/4193242-animals/svg/026-squirrel.svg" 2>/dev/null || true

# 4341021-education (10 unused icons)
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/4341021-education/svg/011-book.svg")" && mv "public/flat-icons/4341021-education/svg/011-book.svg" "$BACKUP_DIR/public/flat-icons/4341021-education/svg/011-book.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/4341021-education/svg/012-laptop.svg")" && mv "public/flat-icons/4341021-education/svg/012-laptop.svg" "$BACKUP_DIR/public/flat-icons/4341021-education/svg/012-laptop.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/4341021-education/svg/017-dictionary.svg")" && mv "public/flat-icons/4341021-education/svg/017-dictionary.svg" "$BACKUP_DIR/public/flat-icons/4341021-education/svg/017-dictionary.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/4341021-education/svg/018-paper-plane.svg")" && mv "public/flat-icons/4341021-education/svg/018-paper-plane.svg" "$BACKUP_DIR/public/flat-icons/4341021-education/svg/018-paper-plane.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/4341021-education/svg/025-medal.svg")" && mv "public/flat-icons/4341021-education/svg/025-medal.svg" "$BACKUP_DIR/public/flat-icons/4341021-education/svg/025-medal.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/4341021-education/svg/029-telescope.svg")" && mv "public/flat-icons/4341021-education/svg/029-telescope.svg" "$BACKUP_DIR/public/flat-icons/4341021-education/svg/029-telescope.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/4341021-education/svg/037-trophy.svg")" && mv "public/flat-icons/4341021-education/svg/037-trophy.svg" "$BACKUP_DIR/public/flat-icons/4341021-education/svg/037-trophy.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/4341021-education/svg/044-color-palette.svg")" && mv "public/flat-icons/4341021-education/svg/044-color-palette.svg" "$BACKUP_DIR/public/flat-icons/4341021-education/svg/044-color-palette.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/4341021-education/svg/048-microscope.svg")" && mv "public/flat-icons/4341021-education/svg/048-microscope.svg" "$BACKUP_DIR/public/flat-icons/4341021-education/svg/048-microscope.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/4341021-education/svg/049-mortarboard.svg")" && mv "public/flat-icons/4341021-education/svg/049-mortarboard.svg" "$BACKUP_DIR/public/flat-icons/4341021-education/svg/049-mortarboard.svg" 2>/dev/null || true

# 8376275-wild-animals-flat-1-of-1 (18 unused icons)
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/8376275-wild-animals-flat-1-of-1/png/007-giraffe.png")" && mv "public/flat-icons/8376275-wild-animals-flat-1-of-1/png/007-giraffe.png" "$BACKUP_DIR/public/flat-icons/8376275-wild-animals-flat-1-of-1/png/007-giraffe.png" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/001-raccoon.svg")" && mv "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/001-raccoon.svg" "$BACKUP_DIR/public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/001-raccoon.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/002-zebra.svg")" && mv "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/002-zebra.svg" "$BACKUP_DIR/public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/002-zebra.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/003-bear.svg")" && mv "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/003-bear.svg" "$BACKUP_DIR/public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/003-bear.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/004-cheetah.svg")" && mv "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/004-cheetah.svg" "$BACKUP_DIR/public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/004-cheetah.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/005-fox.svg")" && mv "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/005-fox.svg" "$BACKUP_DIR/public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/005-fox.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/006-leopard.svg")" && mv "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/006-leopard.svg" "$BACKUP_DIR/public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/006-leopard.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/007-giraffe.svg")" && mv "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/007-giraffe.svg" "$BACKUP_DIR/public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/007-giraffe.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/008-koala.svg")" && mv "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/008-koala.svg" "$BACKUP_DIR/public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/008-koala.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/009-panda-bear.svg")" && mv "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/009-panda-bear.svg" "$BACKUP_DIR/public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/009-panda-bear.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/010-tiger.svg")" && mv "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/010-tiger.svg" "$BACKUP_DIR/public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/010-tiger.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/012-sloth.svg")" && mv "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/012-sloth.svg" "$BACKUP_DIR/public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/012-sloth.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/013-hippopotamus.svg")" && mv "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/013-hippopotamus.svg" "$BACKUP_DIR/public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/013-hippopotamus.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/014-rhinoceros.svg")" && mv "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/014-rhinoceros.svg" "$BACKUP_DIR/public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/014-rhinoceros.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/015-monkey.svg")" && mv "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/015-monkey.svg" "$BACKUP_DIR/public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/015-monkey.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/016-deer.svg")" && mv "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/016-deer.svg" "$BACKUP_DIR/public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/016-deer.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/019-lion.svg")" && mv "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/019-lion.svg" "$BACKUP_DIR/public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/019-lion.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/020-elephant.svg")" && mv "public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/020-elephant.svg" "$BACKUP_DIR/public/flat-icons/8376275-wild-animals-flat-1-of-1/svg/020-elephant.svg" 2>/dev/null || true

# root-icons (22 unused icons)
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/root-icons/bot.svg")" && mv "public/flat-icons/root-icons/bot.svg" "$BACKUP_DIR/public/flat-icons/root-icons/bot.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/root-icons/calligraphy (1).svg")" && mv "public/flat-icons/root-icons/calligraphy (1).svg" "$BACKUP_DIR/public/flat-icons/root-icons/calligraphy (1).svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/root-icons/calligraphy.svg")" && mv "public/flat-icons/root-icons/calligraphy.svg" "$BACKUP_DIR/public/flat-icons/root-icons/calligraphy.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/root-icons/construction.svg")" && mv "public/flat-icons/root-icons/construction.svg" "$BACKUP_DIR/public/flat-icons/root-icons/construction.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/root-icons/cpu.svg")" && mv "public/flat-icons/root-icons/cpu.svg" "$BACKUP_DIR/public/flat-icons/root-icons/cpu.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/root-icons/headphones.svg")" && mv "public/flat-icons/root-icons/headphones.svg" "$BACKUP_DIR/public/flat-icons/root-icons/headphones.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/root-icons/installation.svg")" && mv "public/flat-icons/root-icons/installation.svg" "$BACKUP_DIR/public/flat-icons/root-icons/installation.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/root-icons/jackhammer.svg")" && mv "public/flat-icons/root-icons/jackhammer.svg" "$BACKUP_DIR/public/flat-icons/root-icons/jackhammer.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/root-icons/kana-drop.svg")" && mv "public/flat-icons/root-icons/kana-drop.svg" "$BACKUP_DIR/public/flat-icons/root-icons/kana-drop.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/root-icons/listening.svg")" && mv "public/flat-icons/root-icons/listening.svg" "$BACKUP_DIR/public/flat-icons/root-icons/listening.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/root-icons/logogram.svg")" && mv "public/flat-icons/root-icons/logogram.svg" "$BACKUP_DIR/public/flat-icons/root-icons/logogram.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/root-icons/magnifying-glass.svg")" && mv "public/flat-icons/root-icons/magnifying-glass.svg" "$BACKUP_DIR/public/flat-icons/root-icons/magnifying-glass.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/root-icons/matching.svg")" && mv "public/flat-icons/root-icons/matching.svg" "$BACKUP_DIR/public/flat-icons/root-icons/matching.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/root-icons/music.svg")" && mv "public/flat-icons/root-icons/music.svg" "$BACKUP_DIR/public/flat-icons/root-icons/music.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/root-icons/phone-installation.svg")" && mv "public/flat-icons/root-icons/phone-installation.svg" "$BACKUP_DIR/public/flat-icons/root-icons/phone-installation.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/root-icons/smartphone.svg")" && mv "public/flat-icons/root-icons/smartphone.svg" "$BACKUP_DIR/public/flat-icons/root-icons/smartphone.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/root-icons/story.svg")" && mv "public/flat-icons/root-icons/story.svg" "$BACKUP_DIR/public/flat-icons/root-icons/story.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/root-icons/target.svg")" && mv "public/flat-icons/root-icons/target.svg" "$BACKUP_DIR/public/flat-icons/root-icons/target.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/root-icons/text.svg")" && mv "public/flat-icons/root-icons/text.svg" "$BACKUP_DIR/public/flat-icons/root-icons/text.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/root-icons/volume.svg")" && mv "public/flat-icons/root-icons/volume.svg" "$BACKUP_DIR/public/flat-icons/root-icons/volume.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/root-icons/woman.svg")" && mv "public/flat-icons/root-icons/woman.svg" "$BACKUP_DIR/public/flat-icons/root-icons/woman.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/root-icons/word.svg")" && mv "public/flat-icons/root-icons/word.svg" "$BACKUP_DIR/public/flat-icons/root-icons/word.svg" 2>/dev/null || true

# sakura (6 unused icons)
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/sakura/petals.svg")" && mv "public/flat-icons/sakura/petals.svg" "$BACKUP_DIR/public/flat-icons/sakura/petals.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/sakura/sakura (1).svg")" && mv "public/flat-icons/sakura/sakura (1).svg" "$BACKUP_DIR/public/flat-icons/sakura/sakura (1).svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/sakura/sakura (2).svg")" && mv "public/flat-icons/sakura/sakura (2).svg" "$BACKUP_DIR/public/flat-icons/sakura/sakura (2).svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/sakura/sakura (5).svg")" && mv "public/flat-icons/sakura/sakura (5).svg" "$BACKUP_DIR/public/flat-icons/sakura/sakura (5).svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/sakura/sakura (6).svg")" && mv "public/flat-icons/sakura/sakura (6).svg" "$BACKUP_DIR/public/flat-icons/sakura/sakura (6).svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/sakura/wind-chimes.svg")" && mv "public/flat-icons/sakura/wind-chimes.svg" "$BACKUP_DIR/public/flat-icons/sakura/wind-chimes.svg" 2>/dev/null || true

# stats-bar (4 unused icons)
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/stats-bar/30-days.svg")" && mv "public/flat-icons/stats-bar/30-days.svg" "$BACKUP_DIR/public/flat-icons/stats-bar/30-days.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/stats-bar/7-days.svg")" && mv "public/flat-icons/stats-bar/7-days.svg" "$BACKUP_DIR/public/flat-icons/stats-bar/7-days.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/stats-bar/sakura (5).svg")" && mv "public/flat-icons/stats-bar/sakura (5).svg" "$BACKUP_DIR/public/flat-icons/stats-bar/sakura (5).svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/stats-bar/today.svg")" && mv "public/flat-icons/stats-bar/today.svg" "$BACKUP_DIR/public/flat-icons/stats-bar/today.svg" 2>/dev/null || true

# tori (10 unused icons)
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/tori/fuji.svg")" && mv "public/flat-icons/tori/fuji.svg" "$BACKUP_DIR/public/flat-icons/tori/fuji.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/tori/temple (1).svg")" && mv "public/flat-icons/tori/temple (1).svg" "$BACKUP_DIR/public/flat-icons/tori/temple (1).svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/tori/temple (2).svg")" && mv "public/flat-icons/tori/temple (2).svg" "$BACKUP_DIR/public/flat-icons/tori/temple (2).svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/tori/temple.svg")" && mv "public/flat-icons/tori/temple.svg" "$BACKUP_DIR/public/flat-icons/tori/temple.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/tori/tori (1).svg")" && mv "public/flat-icons/tori/tori (1).svg" "$BACKUP_DIR/public/flat-icons/tori/tori (1).svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/tori/tori (2).svg")" && mv "public/flat-icons/tori/tori (2).svg" "$BACKUP_DIR/public/flat-icons/tori/tori (2).svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/tori/tori.svg")" && mv "public/flat-icons/tori/tori.svg" "$BACKUP_DIR/public/flat-icons/tori/tori.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/tori/torii (1).svg")" && mv "public/flat-icons/tori/torii (1).svg" "$BACKUP_DIR/public/flat-icons/tori/torii (1).svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/tori/torii-gate.svg")" && mv "public/flat-icons/tori/torii-gate.svg" "$BACKUP_DIR/public/flat-icons/tori/torii-gate.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/tori/torii.svg")" && mv "public/flat-icons/tori/torii.svg" "$BACKUP_DIR/public/flat-icons/tori/torii.svg" 2>/dev/null || true

# ui (16 unused icons)
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/ui/Shadowing /app-settings.svg")" && mv "public/flat-icons/ui/Shadowing /app-settings.svg" "$BACKUP_DIR/public/flat-icons/ui/Shadowing /app-settings.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/ui/Shadowing /setting-syncing.svg")" && mv "public/flat-icons/ui/Shadowing /setting-syncing.svg" "$BACKUP_DIR/public/flat-icons/ui/Shadowing /setting-syncing.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/ui/achievements/diamond (2).svg")" && mv "public/flat-icons/ui/achievements/diamond (2).svg" "$BACKUP_DIR/public/flat-icons/ui/achievements/diamond (2).svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/ui/achievements/gold-medal.svg")" && mv "public/flat-icons/ui/achievements/gold-medal.svg" "$BACKUP_DIR/public/flat-icons/ui/achievements/gold-medal.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/ui/achievements/target (1).svg")" && mv "public/flat-icons/ui/achievements/target (1).svg" "$BACKUP_DIR/public/flat-icons/ui/achievements/target (1).svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/ui/facebook.svg")" && mv "public/flat-icons/ui/facebook.svg" "$BACKUP_DIR/public/flat-icons/ui/facebook.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/ui/flash-card.svg")" && mv "public/flat-icons/ui/flash-card.svg" "$BACKUP_DIR/public/flat-icons/ui/flash-card.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/ui/kanji.svg")" && mv "public/flat-icons/ui/kanji.svg" "$BACKUP_DIR/public/flat-icons/ui/kanji.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/ui/navbar/account.svg")" && mv "public/flat-icons/ui/navbar/account.svg" "$BACKUP_DIR/public/flat-icons/ui/navbar/account.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/ui/navbar/books.svg")" && mv "public/flat-icons/ui/navbar/books.svg" "$BACKUP_DIR/public/flat-icons/ui/navbar/books.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/ui/navbar/dashboard.svg")" && mv "public/flat-icons/ui/navbar/dashboard.svg" "$BACKUP_DIR/public/flat-icons/ui/navbar/dashboard.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/ui/navbar/game-console.svg")" && mv "public/flat-icons/ui/navbar/game-console.svg" "$BACKUP_DIR/public/flat-icons/ui/navbar/game-console.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/ui/navbar/home.svg")" && mv "public/flat-icons/ui/navbar/home.svg" "$BACKUP_DIR/public/flat-icons/ui/navbar/home.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/ui/navbar/practice.svg")" && mv "public/flat-icons/ui/navbar/practice.svg" "$BACKUP_DIR/public/flat-icons/ui/navbar/practice.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/ui/robot.svg")" && mv "public/flat-icons/ui/robot.svg" "$BACKUP_DIR/public/flat-icons/ui/robot.svg" 2>/dev/null || true
mkdir -p "$BACKUP_DIR/$(dirname "public/flat-icons/ui/youtube.svg")" && mv "public/flat-icons/ui/youtube.svg" "$BACKUP_DIR/public/flat-icons/ui/youtube.svg" 2>/dev/null || true

echo ""
echo "✅ Done! Unused icons moved to: $BACKUP_DIR"
echo ""
echo "To restore: cp -r $BACKUP_DIR/* ."
echo "To delete backup: rm -rf $BACKUP_DIR"
