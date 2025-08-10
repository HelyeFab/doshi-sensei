#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files to update (excluding already updated ones and backup files)
const filesToUpdate = [
  'src/app/tools/textbook-vocabulary/components/VocabularyLearningView.tsx',
  'src/app/tools/textbook-vocabulary/page.tsx',
  'src/app/practice/hiragana/page.tsx',
  'src/app/practice/katakana/page.tsx',
  'src/app/account/page.tsx',
  'src/app/achievements/page.tsx',
  'src/app/tools/popular-videos/page.tsx',
  'src/app/games/kanji-simon/page.tsx',
  'src/app/games/reading-routes/page.tsx',
  'src/app/tools/youtube-shadowing/page.tsx',
  'src/app/read/page.tsx',
  'src/app/drill/conjugation/page.tsx',
  'src/app/stories/page.tsx',
  'src/app/settings/page.tsx',
  'src/app/settings/privacy-policy/page.tsx',
  'src/app/settings/terms-of-service/page.tsx',
  'src/app/stories/[slug]/page.tsx',
  'src/app/settings/acknowledgments/page.tsx',
  'src/app/resources/[slug]/page.tsx',
  'src/app/resources/page.tsx',
  'src/app/practice/snake-adjust/page.tsx',
  'src/app/practice/snake-demo/page.tsx',
  'src/app/practice/kana/page.tsx',
  'src/app/practice/conjugation/page.tsx',
  'src/app/news/[id]/page.tsx',
  'src/app/news/page.tsx',
  'src/app/kanji-moods/page.tsx',
  'src/app/kanji-browser/page.tsx',
  'src/app/kanji-moods/[boardId]/page.tsx',
  'src/app/games/reading-routes/[boardId]/page.tsx',
  'src/app/games/kanji-simon/[boardId]/page.tsx',
  'src/app/favourites/page.tsx',
  'src/app/drill/flashcards/page.tsx'
];

function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    // Update import statement
    if (content.includes("import { StandardPageHeader } from '@/components/StandardPageHeader';")) {
      content = content.replace(
        "import { StandardPageHeader } from '@/components/StandardPageHeader';",
        "import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';"
      );
      updated = true;
    }

    // Update component usage - remove backHref prop
    const standardHeaderRegex = /<StandardPageHeader([^>]*?)(\s+backHref="[^"]*")?([^>]*?)\/>/g;
    if (standardHeaderRegex.test(content)) {
      content = content.replace(standardHeaderRegex, (match, before, backHref, after) => {
        // Remove backHref if present
        const cleanedBefore = before || '';
        const cleanedAfter = after || '';
        return `<SmartPageHeader${cleanedBefore}${cleanedAfter}/>`;
      });
      updated = true;
    }

    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      return true;
    } else {
      console.log(`⏭️  Skipped: ${filePath} (no changes needed)`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

console.log('Starting navigation migration...\n');

let updatedCount = 0;
let errorCount = 0;

filesToUpdate.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    if (updateFile(fullPath)) {
      updatedCount++;
    }
  } else {
    console.log(`❌ File not found: ${file}`);
    errorCount++;
  }
});

console.log(`\n✅ Migration complete!`);
console.log(`📊 Updated ${updatedCount} files`);
if (errorCount > 0) {
  console.log(`❌ ${errorCount} files had errors`);
}