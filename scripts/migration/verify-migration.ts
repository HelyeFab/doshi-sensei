/**
 * Verification script to check migration status
 * Run this after migration to ensure everything worked
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

class MigrationVerifier {
  private db: FirebaseFirestore.Firestore;
  
  constructor() {
    // Initialize Firebase Admin with service account file
    if (!admin.apps.length) {
      const serviceAccount = require('../../firebase-service-account.json');
      initializeApp({
        credential: cert(serviceAccount),
      });
    }
    
    this.db = getFirestore();
  }

  async verify() {
    console.log('🔍 Verifying Review Hub Migration\n');
    console.log('='.repeat(50));
    
    // 1. Check users with migration status
    console.log('\n📊 User Migration Status:');
    const usersSnapshot = await this.db.collection('users').get();
    
    let migratedCount = 0;
    let notMigratedCount = 0;
    
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const migrationStatus = userData.migration?.reviewHub;
      
      if (migrationStatus?.completed) {
        migratedCount++;
        console.log(`  ✅ ${doc.id}: Migrated on ${migrationStatus.date.toDate().toLocaleDateString()}`);
        console.log(`     - Items: ${JSON.stringify(migrationStatus.stats)}`);
      } else {
        notMigratedCount++;
        console.log(`  ⚠️  ${doc.id}: Not migrated`);
      }
    }
    
    console.log(`\n  Total: ${migratedCount} migrated, ${notMigratedCount} not migrated`);
    
    // 2. Check review_hub collection
    console.log('\n📦 Review Hub Collection:');
    const reviewHubSnapshot = await this.db.collection('review_hub').get();
    
    const statsByUser = new Map<string, {
      kanji: number;
      vocabulary: number;
      flashcards: number;
      total: number;
    }>();
    
    reviewHubSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const userId = data.userId;
      
      if (!statsByUser.has(userId)) {
        statsByUser.set(userId, {
          kanji: 0,
          vocabulary: 0,
          flashcards: 0,
          total: 0
        });
      }
      
      const stats = statsByUser.get(userId)!;
      stats.total++;
      
      switch(data.sourceType) {
        case 'kanji_mastery':
          stats.kanji++;
          break;
        case 'textbook_vocabulary':
          stats.vocabulary++;
          break;
        case 'flashcards':
          stats.flashcards++;
          break;
      }
    });
    
    console.log(`  Total documents: ${reviewHubSnapshot.size}`);
    console.log('\n  Per-user breakdown:');
    
    statsByUser.forEach((stats, userId) => {
      console.log(`    ${userId}:`);
      console.log(`      - Kanji: ${stats.kanji}`);
      console.log(`      - Vocabulary: ${stats.vocabulary}`);
      console.log(`      - Flashcards: ${stats.flashcards}`);
      console.log(`      - Total: ${stats.total}`);
    });
    
    // 3. Sample data check
    console.log('\n🔎 Sample Data (first 3 items):');
    const sampleDocs = await this.db.collection('review_hub').limit(3).get();
    
    sampleDocs.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n  Item ${index + 1}:`);
      console.log(`    ID: ${doc.id}`);
      console.log(`    User: ${data.userId}`);
      console.log(`    Type: ${data.sourceType} / ${data.contentType}`);
      console.log(`    Content: ${data.content.primary}`);
      console.log(`    Due: ${data.scheduling.dueDate.toDate().toLocaleDateString()}`);
      console.log(`    State: ${data.scheduling.state}`);
    });
    
    // 4. Check for issues
    console.log('\n⚡ Potential Issues:');
    
    // Check for items without userId
    const noUserIdSnapshot = await this.db.collection('review_hub')
      .where('userId', '==', null)
      .limit(5)
      .get();
    
    if (!noUserIdSnapshot.empty) {
      console.log(`  ⚠️  Found ${noUserIdSnapshot.size} items without userId`);
    } else {
      console.log('  ✅ All items have userId');
    }
    
    // Check for items with invalid dates
    const invalidDates: string[] = [];
    reviewHubSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (!data.scheduling?.dueDate) {
        invalidDates.push(doc.id);
      }
    });
    
    if (invalidDates.length > 0) {
      console.log(`  ⚠️  Found ${invalidDates.length} items with invalid due dates`);
    } else {
      console.log('  ✅ All items have valid due dates');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Verification complete!\n');
  }

  async rollback() {
    console.log('⚠️  ROLLBACK: This will delete all migrated data!');
    console.log('Press Ctrl+C to cancel, waiting 5 seconds...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Delete review_hub collection
    const batch = this.db.batch();
    const snapshot = await this.db.collection('review_hub').get();
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`Deleted ${snapshot.size} documents from review_hub`);
    
    // Remove migration status from users
    const usersSnapshot = await this.db.collection('users').get();
    
    for (const doc of usersSnapshot.docs) {
      await doc.ref.update({
        'migration.reviewHub': admin.firestore.FieldValue.delete()
      });
    }
    
    console.log('✅ Rollback complete');
  }
}

// Run verification
async function main() {
  const args = process.argv.slice(2);
  const verifier = new MigrationVerifier();
  
  if (args.includes('--rollback')) {
    await verifier.rollback();
  } else {
    await verifier.verify();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { MigrationVerifier };