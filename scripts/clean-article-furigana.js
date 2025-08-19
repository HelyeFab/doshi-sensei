const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

/**
 * Clean furigana annotations from text
 */
function cleanArticleFurigana(text) {
  if (!text) return '';

  const patterns = [
    // Standard parentheses: 漢字(ひらがな)
    /([一-龯々]+)\([ぁ-んー]+\)/g,
    // Full-width parentheses: 漢字（ひらがな）
    /([一-龯々]+)（[ぁ-んー]+）/g,
    // Square brackets: 漢字[ひらがな]
    /([一-龯々]+)\[[ぁ-んー]+\]/g,
    // Full-width square brackets: 漢字【ひらがな】
    /([一-龯々]+)【[ぁ-んー]+】/g,
    // Mixed kanji-kana with furigana
    /([一-龯々]+[ぁ-んー]*)\([ぁ-んー]+\)/g,
    /([一-龯々]+[ぁ-んー]*)（[ぁ-んー]+）/g,
  ];

  let cleanedText = text;
  
  patterns.forEach(pattern => {
    cleanedText = cleanedText.replace(pattern, '$1');
  });

  // Clean up standalone hiragana in parentheses
  cleanedText = cleanedText.replace(/\([ぁ-んー]+\)/g, '');
  cleanedText = cleanedText.replace(/（[ぁ-んー]+）/g, '');
  cleanedText = cleanedText.replace(/\[[ぁ-んー]+\]/g, '');
  cleanedText = cleanedText.replace(/【[ぁ-んー]+】/g, '');

  // Clean up double spaces
  cleanedText = cleanedText.replace(/\s+/g, ' ').trim();

  return cleanedText;
}

/**
 * Check if text has furigana annotations
 */
function hasFuriganaAnnotations(text) {
  if (!text) return false;

  const patterns = [
    /[一-龯々]+\([ぁ-んー]+\)/,
    /[一-龯々]+（[ぁ-んー]+）/,
    /[一-龯々]+\[[ぁ-んー]+\]/,
    /[一-龯々]+【[ぁ-んー]+】/,
  ];

  return patterns.some(pattern => pattern.test(text));
}

async function cleanArticles() {
  try {
    console.log('🔍 Fetching articles with potential furigana...');
    
    // Get all articles
    const articlesSnapshot = await db.collection('articles')
      .where('visible', '==', true)
      .limit(100) // Process in batches
      .get();

    if (articlesSnapshot.empty) {
      console.log('No articles found.');
      return;
    }

    console.log(`Found ${articlesSnapshot.size} articles to check.`);

    let cleanedCount = 0;
    const batch = db.batch();

    for (const doc of articlesSnapshot.docs) {
      const data = doc.data();
      const content = data.content || data.body || '';
      
      if (hasFuriganaAnnotations(content)) {
        const cleanedContent = cleanArticleFurigana(content);
        
        console.log(`📝 Cleaning article: ${data.title?.substring(0, 50)}...`);
        console.log(`   Before: ${content.substring(0, 100)}...`);
        console.log(`   After:  ${cleanedContent.substring(0, 100)}...`);
        
        batch.update(doc.ref, {
          content: cleanedContent,
          furiganaCleaned: true,
          cleanedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`\n✅ Cleaning ${cleanedCount} articles...`);
      await batch.commit();
      console.log('✨ Articles successfully cleaned!');
    } else {
      console.log('✅ No articles needed cleaning.');
    }

  } catch (error) {
    console.error('❌ Error cleaning articles:', error);
  } finally {
    process.exit(0);
  }
}

// Run the cleanup
cleanArticles();