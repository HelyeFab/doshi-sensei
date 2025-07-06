const admin = require('firebase-admin');

// Initialize Firebase Admin
try {
  const serviceAccount = require('../firebase-admin-key.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.log('Using environment variables for Firebase initialization');
  
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  
  admin.initializeApp({
    credential: admin.credential.cert({
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
    })
  });
}

const db = admin.firestore();

async function diagnoseArticles() {
  try {
    console.log('🔍 Diagnosing articles in Firebase...\n');
    
    const articlesRef = db.collection('articles');
    const snapshot = await articlesRef.limit(10).get();
    
    console.log(`Found ${snapshot.size} articles (showing first 10)\n`);
    
    const stats = {
      total: 0,
      withContent: 0,
      withBody: 0,
      withText: 0,
      withSummary: 0,
      withTitle: 0,
      noContent: 0,
      contentFields: new Set()
    };
    
    snapshot.forEach(doc => {
      stats.total++;
      const data = doc.data();
      
      // Check which content fields exist
      Object.keys(data).forEach(key => {
        if (key.toLowerCase().includes('content') || 
            key.toLowerCase().includes('body') || 
            key.toLowerCase().includes('text')) {
          stats.contentFields.add(key);
        }
      });
      
      const hasContent = !!data.content;
      const hasBody = !!data.body;
      const hasText = !!data.text;
      const hasSummary = !!data.summary;
      const hasTitle = !!data.title;
      
      if (hasContent) stats.withContent++;
      if (hasBody) stats.withBody++;
      if (hasText) stats.withText++;
      if (hasSummary) stats.withSummary++;
      if (hasTitle) stats.withTitle++;
      if (!hasContent && !hasBody && !hasText) stats.noContent++;
      
      console.log(`\n📄 Article: ${doc.id}`);
      console.log(`   Title: ${data.title || 'NO TITLE'}`);
      console.log(`   Fields: ${Object.keys(data).join(', ')}`);
      console.log(`   Content fields:`);
      console.log(`   - content: ${hasContent ? `✅ (${data.content?.length || 0} chars)` : '❌'}`);
      console.log(`   - body: ${hasBody ? `✅ (${data.body?.length || 0} chars)` : '❌'}`);
      console.log(`   - text: ${hasText ? `✅ (${data.text?.length || 0} chars)` : '❌'}`);
      console.log(`   - summary: ${hasSummary ? `✅ (${data.summary?.length || 0} chars)` : '❌'}`);
      
      // Show sample of content
      const contentField = data.content || data.body || data.text || data.summary;
      if (contentField) {
        console.log(`   Sample: "${contentField.substring(0, 100)}..."`);
      }
    });
    
    console.log('\n\n📊 Summary Statistics:');
    console.log(`Total articles checked: ${stats.total}`);
    console.log(`Articles with 'content' field: ${stats.withContent}`);
    console.log(`Articles with 'body' field: ${stats.withBody}`);
    console.log(`Articles with 'text' field: ${stats.withText}`);
    console.log(`Articles with 'summary' field: ${stats.withSummary}`);
    console.log(`Articles with 'title' field: ${stats.withTitle}`);
    console.log(`Articles with NO content fields: ${stats.noContent}`);
    console.log(`\nUnique content-related fields found: ${Array.from(stats.contentFields).join(', ')}`);
    
    // Check a specific article if ID provided
    const specificId = process.argv[2];
    if (specificId) {
      console.log(`\n\n🔎 Checking specific article: ${specificId}`);
      const specificDoc = await articlesRef.doc(specificId).get();
      
      if (specificDoc.exists) {
        const data = specificDoc.data();
        console.log('Article found!');
        console.log('All fields:', Object.keys(data));
        console.log('\nFull data structure:');
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log('❌ Article not found!');
      }
    }
    
  } catch (error) {
    console.error('Error diagnosing articles:', error);
  } finally {
    process.exit();
  }
}

// Run diagnosis
diagnoseArticles();