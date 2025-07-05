const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin SDK
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!admin.apps.length) {
  try {
    const serviceAccount = {
      type: "service_account",
      project_id: projectId,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    process.exit(1);
  }
}

const db = admin.firestore();

// Test article patterns to identify and delete
const TEST_PATTERNS = {
  titles: [
    'NHK Easy Scraping Test',
    'Todaii Scraping Test',
    'Test Article - Netlify Functions Working',
    'Watanoc Scraping Test',
    'Test Article',
    'Fallback Article'
  ],
  categories: ['test', 'fallback'],
  tags: ['test', 'debug', 'fallback'],
  sourceIds: ['test', 'fallback']
};

async function findTestArticles() {
  console.log('🔍 Searching for test articles...');
  
  const articlesRef = db.collection('articles');
  const snapshot = await articlesRef.get();
  
  const testArticles = [];
  
  snapshot.forEach(doc => {
    const article = { id: doc.id, ...doc.data() };
    let isTest = false;
    
    // Check title patterns
    for (const pattern of TEST_PATTERNS.titles) {
      if (article.title && article.title.includes(pattern)) {
        isTest = true;
        break;
      }
    }
    
    // Check category
    if (!isTest && article.category && TEST_PATTERNS.categories.includes(article.category)) {
      isTest = true;
    }
    
    // Check tags
    if (!isTest && article.tags && Array.isArray(article.tags)) {
      for (const tag of article.tags) {
        if (TEST_PATTERNS.tags.includes(tag)) {
          isTest = true;
          break;
        }
      }
    }
    
    // Check source ID
    if (!isTest && article.source && article.source.id && TEST_PATTERNS.sourceIds.includes(article.source.id)) {
      isTest = true;
    }
    
    // Check if it's a fallback article (contains 'fallback' in ID or title)
    if (!isTest && (
      article.id.includes('fallback') || 
      (article.title && article.title.toLowerCase().includes('fallback'))
    )) {
      isTest = true;
    }
    
    if (isTest) {
      testArticles.push(article);
    }
  });
  
  return testArticles;
}

async function deleteTestArticles(articles, dryRun = true) {
  if (articles.length === 0) {
    console.log('✅ No test articles found!');
    return;
  }
  
  console.log(`\n📋 Found ${articles.length} test articles:`);
  
  // Display articles to be deleted
  articles.forEach((article, index) => {
    console.log(`\n${index + 1}. ${article.title || 'No title'}`);
    console.log(`   ID: ${article.id}`);
    console.log(`   Category: ${article.category || 'N/A'}`);
    console.log(`   Tags: ${article.tags ? article.tags.join(', ') : 'N/A'}`);
    console.log(`   Source: ${article.source?.id || 'N/A'}`);
    console.log(`   Date: ${article.publishDate ? new Date(article.publishDate._seconds * 1000).toLocaleString() : 'N/A'}`);
  });
  
  if (dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No articles will be deleted');
    console.log('Run with --delete flag to actually delete these articles');
    return;
  }
  
  // Confirm deletion
  console.log('\n⚠️  WARNING: This will permanently delete these articles!');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to proceed...');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('\n🗑️  Deleting articles...');
  
  const batch = db.batch();
  let deletedCount = 0;
  
  for (const article of articles) {
    try {
      batch.delete(db.collection('articles').doc(article.id));
      deletedCount++;
    } catch (error) {
      console.error(`❌ Failed to queue deletion for ${article.id}:`, error.message);
    }
  }
  
  try {
    await batch.commit();
    console.log(`\n✅ Successfully deleted ${deletedCount} test articles!`);
  } catch (error) {
    console.error('❌ Error committing batch deletion:', error);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const shouldDelete = args.includes('--delete');
  
  try {
    const testArticles = await findTestArticles();
    await deleteTestArticles(testArticles, !shouldDelete);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
main();