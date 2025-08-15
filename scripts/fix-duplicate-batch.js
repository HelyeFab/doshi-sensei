#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// List of files to fix
const filesToFix = [
  'netlify/functions/scrape-yahoo-news.js',
  'netlify/functions/scrape-mainichi-news.js',
  'netlify/functions/scrape-mainichi-shogakusei.js'
];

function fixDuplicateBatch(filePath) {
  console.log(`\nFixing: ${filePath}`);
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Find the saveArticlesToFirebase function
  const functionMatch = content.match(/async function saveArticlesToFirebase\(articles\)[\s\S]*?^}/m);
  if (!functionMatch) {
    console.log('❌ Could not find saveArticlesToFirebase function');
    return;
  }
  
  // Replace the function with fixed version
  const fixedFunction = `async function saveArticlesToFirebase(articles) {
  if (!db || !firebaseInitialized) {
    throw new Error('Firebase not initialized');
  }

  // Filter out invalid articles before saving
  const validArticles = filterArticles(articles);
  console.log(\`📊 After validation: \${validArticles.length} valid articles (filtered \${articles.length - validArticles.length})\`);
  
  if (validArticles.length === 0) {
    console.log('⚠️ No valid articles to save');
    return false;
  }
  
  // Only save valid articles
  const batch = db.batch();
  const articlesRef = db.collection('articles');
  
  for (const article of validArticles) {
    const docRef = articlesRef.doc(article.id);
    batch.set(docRef, {
      ...article,
      publishDate: admin.firestore.Timestamp.fromDate(article.publishDate),
      scrapedAt: admin.firestore.Timestamp.fromDate(article.scrapedAt)
    });
  }
  
  await batch.commit();
  console.log(\`✅ Successfully saved \${validArticles.length} articles to Firebase\`);
  return true;
}`;

  // Replace the function in the content
  const updatedContent = content.replace(/async function saveArticlesToFirebase\(articles\)[\s\S]*?^}/m, fixedFunction);
  
  // Write back
  fs.writeFileSync(filePath, updatedContent);
  console.log('✅ Fixed duplicate batch declaration');
}

// Fix each file
filesToFix.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    fixDuplicateBatch(fullPath);
  } else {
    console.log(`❌ File not found: ${fullPath}`);
  }
});

console.log('\n✅ All files fixed!');