const admin = require('firebase-admin');
const serviceAccount = require('../firebase-admin-key.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkArticleContent() {
  try {
    console.log('Checking articles for missing content...');
    
    const articlesRef = db.collection('articles');
    const snapshot = await articlesRef.get();
    
    let totalArticles = 0;
    let missingContent = 0;
    let fixedArticles = 0;
    
    for (const doc of snapshot.docs) {
      totalArticles++;
      const data = doc.data();
      
      if (!data.content && !data.body && !data.text) {
        missingContent++;
        console.log(`\nArticle ${doc.id} is missing content:`);
        console.log('- Title:', data.title);
        console.log('- Summary:', data.summary?.substring(0, 100));
        console.log('- Available fields:', Object.keys(data).filter(k => data[k]));
        
        // Try to fix by using summary as content
        if (data.summary && data.summary.length > 50) {
          await doc.ref.update({
            content: data.summary
          });
          fixedArticles++;
          console.log('✅ Fixed by using summary as content');
        }
      }
    }
    
    console.log('\n--- Summary ---');
    console.log(`Total articles: ${totalArticles}`);
    console.log(`Missing content: ${missingContent}`);
    console.log(`Fixed articles: ${fixedArticles}`);
    console.log(`Still missing: ${missingContent - fixedArticles}`);
    
  } catch (error) {
    console.error('Error checking articles:', error);
  } finally {
    process.exit();
  }
}

// Run the check
checkArticleContent();