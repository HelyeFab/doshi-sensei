#!/usr/bin/env node

/**
 * Script to apply article validation to all scraping functions
 * This will update each scraper to:
 * 1. Import the validation module
 * 2. Filter articles before saving
 * 3. Log filtering statistics
 */

const fs = require('fs');
const path = require('path');

const scraperFiles = [
  'scrape-nhk-easy.js',
  'scrape-nhk-improved.js', 
  'scrape-yahoo-news.js',
  'scrape-mainichi-news.js',
  'scrape-mainichi-shogakusei.js',
  'scrape-news-scheduled-enhanced.js'
];

const functionsDir = path.join(__dirname, '..', 'netlify', 'functions');

function updateScraper(filePath) {
  const fileName = path.basename(filePath);
  console.log(`\n📝 Updating ${fileName}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Check if already has validation
  if (content.includes('article-quick-validation')) {
    console.log(`  ✅ Already has validation`);
    return false;
  }
  
  // Add import statement if not present
  if (!content.includes("require('./article-quick-validation')")) {
    // Find the last require statement
    const requirePattern = /const\s+.*\s*=\s*require\([^)]+\);/g;
    const matches = [...content.matchAll(requirePattern)];
    
    if (matches.length > 0) {
      const lastRequire = matches[matches.length - 1];
      const insertPosition = lastRequire.index + lastRequire[0].length;
      
      const importStatement = "\nconst { filterArticles, quickValidate } = require('./article-quick-validation');";
      content = content.slice(0, insertPosition) + importStatement + content.slice(insertPosition);
      console.log(`  ✅ Added import statement`);
      modified = true;
    }
  }
  
  // Find where articles are saved and add filtering
  // Pattern 1: Direct Firebase batch saving
  const savePattern1 = /(\s+)(await batch\.commit\(\);)/g;
  if (savePattern1.test(content)) {
    content = content.replace(
      /const articles = \[\];([\s\S]*?)(await batch\.commit\(\);)/g,
      `const articles = [];$1// Filter out invalid articles before saving
  const validArticles = filterArticles(articles);
  console.log(\`📊 After validation: \${validArticles.length} valid articles (filtered \${articles.length - validArticles.length})\`);
  
  // Only save valid articles
  const batch = db.batch();
  for (const article of validArticles) {
    const docRef = db.collection('articles').doc(article.id);
    batch.set(docRef, article);
  }
  $2`
    );
    console.log(`  ✅ Added filtering before batch commit`);
    modified = true;
  }
  
  // Pattern 2: Using saveArticlesWithDeduplication
  const savePattern2 = /(savedCount\s*=\s*await saveArticlesWithDeduplication\(db,\s*)(articles)(,\s*admin\))/g;
  if (savePattern2.test(content)) {
    // First add filtering before the save
    content = content.replace(
      /(console\.log\(`.*Scraped.*\${articles\.length}.*`\);)([\s\S]*?)(savedCount\s*=\s*await saveArticlesWithDeduplication)/g,
      `$1

    // Filter out invalid articles (English, errors, etc.)
    const validArticles = filterArticles(articles);
    console.log(\`📊 After validation: \${validArticles.length} valid articles (filtered \${articles.length - validArticles.length})\`);
$2$3`
    );
    
    // Then update the save call to use validArticles
    content = content.replace(
      /(savedCount\s*=\s*await saveArticlesWithDeduplication\(db,\s*)articles(,\s*admin\))/g,
      '$1validArticles$2'
    );
    console.log(`  ✅ Added filtering before saveArticlesWithDeduplication`);
    modified = true;
  }
  
  // Pattern 3: For scheduled scrapers that trigger other scrapers
  if (fileName === 'scrape-news-scheduled-enhanced.js') {
    // This one triggers other scrapers, so we just need to ensure
    // those scrapers have validation. No direct changes needed here
    // unless it processes articles directly.
    console.log(`  ℹ️ Scheduled scraper - validation handled by individual scrapers`);
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`  ✅ File updated successfully`);
    return true;
  } else {
    console.log(`  ⚠️ No changes made - manual review may be needed`);
    return false;
  }
}

console.log('🚀 Applying validation to all scrapers...\n');

let updatedCount = 0;
let skippedCount = 0;

for (const fileName of scraperFiles) {
  const filePath = path.join(functionsDir, fileName);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${fileName}`);
    continue;
  }
  
  if (updateScraper(filePath)) {
    updatedCount++;
  } else {
    skippedCount++;
  }
}

console.log('\n' + '='.repeat(50));
console.log(`✅ Update complete!`);
console.log(`  📊 Updated: ${updatedCount} files`);
console.log(`  ⏭️ Skipped: ${skippedCount} files`);
console.log('='.repeat(50));

console.log('\n📌 Next steps:');
console.log('  1. Review the changes in each file');
console.log('  2. Test scrapers locally with: netlify functions:invoke [function-name]');
console.log('  3. Deploy to Netlify');
console.log('  4. Monitor logs for filtering statistics');