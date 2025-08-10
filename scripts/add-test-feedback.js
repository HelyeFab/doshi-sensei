#!/usr/bin/env node

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.firestore();

const testReports = [
  {
    category: 'feedback',
    title: 'Love the new UI design!',
    description: 'The recent UI updates make the app much more intuitive. The navigation is clearer and the colors are easier on the eyes. Great work!',
    userEmail: 'happy-user@example.com',
    userName: 'Happy User',
    status: 'new',
    priority: 'low',
    tags: ['feedback', 'ui', 'positive']
  },
  {
    category: 'feature',
    title: 'Add dark mode support',
    description: 'It would be great to have a dark mode option for studying at night. This would reduce eye strain and make late-night study sessions more comfortable.',
    userEmail: 'night-owl@example.com',
    userName: 'Night Owl',
    status: 'new',
    priority: 'medium',
    tags: ['feature', 'ui', 'accessibility']
  },
  {
    category: 'support',
    title: 'How to export my progress?',
    description: 'I want to backup my learning progress but cannot find an export option. Is there a way to download my data?',
    userEmail: 'backup-user@example.com',
    userName: 'Backup User',
    status: 'new',
    priority: 'low',
    tags: ['support', 'data', 'question']
  },
  {
    category: 'feedback',
    title: 'Kanji practice is amazing',
    description: 'The kanji mood boards are incredibly helpful for memorization. The visual associations really stick in my mind. This is the best Japanese learning app I have used!',
    userEmail: 'kanji-lover@example.com',
    userName: 'Kanji Lover',
    status: 'new',
    priority: 'low',
    tags: ['feedback', 'kanji', 'positive']
  }
];

async function addTestReports() {
  console.log('🚀 Adding test feedback and feature requests...\n');
  
  try {
    for (const report of testReports) {
      // Generate ID
      const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const reportId = `${report.category.toUpperCase()}_${timestamp}_${randomSuffix}`;
      
      // Create full report
      const fullReport = {
        id: reportId,
        ...report,
        url: 'https://doshisensei.com/test',
        userAgent: 'Mozilla/5.0 Test Script',
        viewport: '1920x1080',
        timestamp: admin.firestore.Timestamp.now(),
        adminNotes: [],
        obsidianSynced: false,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      };
      
      await db.collection('bugReports').doc(reportId).set(fullReport);
      
      console.log(`✅ Added ${report.category}: ${report.title}`);
      console.log(`   ID: ${reportId}`);
    }
    
    console.log('\n🎉 Successfully added', testReports.length, 'test reports!');
    console.log('\n💡 You can now sync these in Obsidian to see them organized by category');
    
  } catch (error) {
    console.error('❌ Error adding test reports:', error);
  } finally {
    process.exit(0);
  }
}

// Check for --clean flag to remove test data
if (process.argv.includes('--clean')) {
  console.log('🧹 Cleaning up test reports...\n');
  
  db.collection('bugReports')
    .where('userAgent', '==', 'Mozilla/5.0 Test Script')
    .get()
    .then(snapshot => {
      const batch = db.batch();
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
        console.log(`🗑️  Deleting ${doc.id}`);
      });
      return batch.commit();
    })
    .then(() => {
      console.log('\n✅ Cleaned up test reports');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error cleaning test reports:', error);
      process.exit(1);
    });
} else {
  addTestReports();
}