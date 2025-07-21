/**
 * Migration script to migrate data from obsolete collections to new ones
 * Run this script to migrate:
 * 1. analytics -> site-analytics (already handled by new analytics tracker)
 * 2. storyProgress -> reading_progress
 * 
 * Usage: Add this to a temporary admin page or run via Firebase Functions
 */

'use client';

import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  setDoc,
  Timestamp,
  writeBatch,
  query,
  limit
} from 'firebase/firestore';
import { readingProgressManager } from '@/utils/readingProgressManager';

interface MigrationResult {
  collection: string;
  total: number;
  migrated: number;
  failed: number;
  errors: string[];
}

/**
 * Migrate storyProgress to reading_progress collection
 */
async function migrateStoryProgress(): Promise<MigrationResult> {
  const result: MigrationResult = {
    collection: 'storyProgress -> reading_progress',
    total: 0,
    migrated: 0,
    failed: 0,
    errors: []
  };

  try {
    console.log('Starting storyProgress migration...');
    
    // Get all documents from storyProgress collection
    const progressRef = collection(db, 'storyProgress');
    const snapshot = await getDocs(progressRef);
    
    result.total = snapshot.size;
    console.log(`Found ${result.total} story progress documents to migrate`);

    // Process in batches to avoid overwhelming the system
    const batch = writeBatch(db);
    let batchCount = 0;
    const BATCH_SIZE = 500;

    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();
        const progressId = doc.id;
        
        // Parse userId and storyId from the document ID
        // Format appears to be: userId_storyId (e.g., "WawMEtfq0dcoVPMr3nuwpFAzr9F2_aki-went-to-school")
        const underscoreIndex = progressId.indexOf('_');
        
        if (underscoreIndex === -1) {
          result.failed++;
          result.errors.push(`Invalid document ID format (no underscore): ${progressId}`);
          continue;
        }
        
        const userId = progressId.substring(0, underscoreIndex);
        const storyId = progressId.substring(underscoreIndex + 1);

        if (!userId || !storyId) {
          result.failed++;
          result.errors.push(`Failed to parse userId/storyId from: ${progressId}`);
          continue;
        }

        // Create new reading_progress document
        const newProgressId = `${userId}_story_${storyId}`;
        const newProgressRef = doc(db, 'reading_progress', newProgressId);
        
        const newProgressData = {
          userId,
          contentId: storyId,
          contentType: 'story' as const,
          progress: data.progress || 0,
          updatedAt: data.lastReadAt || Timestamp.now(),
          completed: data.completed || false,
          completedAt: data.completedAt || (data.completed ? data.lastReadAt : null),
          currentPage: data.currentPage,
          totalPages: data.totalPages,
          lastReadSection: data.lastReadSection,
          timeSpent: 0 // Legacy doesn't track this
        };

        batch.set(newProgressRef, newProgressData);
        batchCount++;

        // Commit batch if it reaches the size limit
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          console.log(`Committed batch of ${batchCount} documents`);
          result.migrated += batchCount;
          batchCount = 0;
        }
      } catch (error) {
        result.failed++;
        result.errors.push(`Failed to migrate ${doc.id}: ${error}`);
      }
    }

    // Commit any remaining documents
    if (batchCount > 0) {
      await batch.commit();
      result.migrated += batchCount;
      console.log(`Committed final batch of ${batchCount} documents`);
    }

    console.log(`Migration complete: ${result.migrated} migrated, ${result.failed} failed`);
  } catch (error) {
    console.error('Migration failed:', error);
    result.errors.push(`Migration failed: ${error}`);
  }

  return result;
}

/**
 * Main migration function
 */
export async function runMigration(): Promise<{
  success: boolean;
  results: MigrationResult[];
  summary: string;
}> {
  console.log('🔄 Starting collection migration...');
  
  const results: MigrationResult[] = [];
  
  try {
    // Migrate storyProgress
    const storyProgressResult = await migrateStoryProgress();
    results.push(storyProgressResult);

    // Note: analytics collection migration is not needed as the new analytics
    // system writes to site-analytics. Old data can be archived or deleted.

    // Generate summary
    const totalMigrated = results.reduce((sum, r) => sum + r.migrated, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
    const totalDocuments = results.reduce((sum, r) => sum + r.total, 0);

    const summary = `
Migration Summary:
==================
Total documents: ${totalDocuments}
Successfully migrated: ${totalMigrated}
Failed: ${totalFailed}

Collection Details:
${results.map(r => `
${r.collection}:
  - Total: ${r.total}
  - Migrated: ${r.migrated}
  - Failed: ${r.failed}
  ${r.errors.length > 0 ? `- Errors: ${r.errors.slice(0, 5).join('\n    ')}` : ''}
`).join('\n')}

Next Steps:
1. Verify migrated data in the new collections
2. Test the application with new collections
3. Once verified, delete the old collections:
   - analytics (replaced by site-analytics)
   - storyProgress (replaced by reading_progress)
   - scraping_logs (if no longer needed)
`;

    console.log(summary);

    return {
      success: totalFailed === 0,
      results,
      summary
    };
  } catch (error) {
    console.error('Migration error:', error);
    return {
      success: false,
      results,
      summary: `Migration failed: ${error}`
    };
  }
}

/**
 * Verify migration by comparing counts
 */
export async function verifyMigration(): Promise<{
  storyProgress: { old: number; new: number; match: boolean };
}> {
  try {
    // Count old storyProgress documents
    const oldProgressRef = collection(db, 'storyProgress');
    const oldSnapshot = await getDocs(query(oldProgressRef, limit(1000)));
    const oldCount = oldSnapshot.size;

    // Count new reading_progress documents for stories
    const newProgressRef = collection(db, 'reading_progress');
    const newSnapshot = await getDocs(newProgressRef);
    const storyProgressCount = newSnapshot.docs.filter(
      doc => doc.data().contentType === 'story'
    ).length;

    return {
      storyProgress: {
        old: oldCount,
        new: storyProgressCount,
        match: oldCount === storyProgressCount
      }
    };
  } catch (error) {
    console.error('Verification error:', error);
    throw error;
  }
}

