/**
 * Enable Firebase Sync for Textbook Vocabulary
 * This module patches the existing TextbookVocabularyService to add Firebase sync
 */

import { TextbookVocabularyService } from './textbook-vocabulary-service';
import { TextbookVocabularyFirebaseSync } from './firebase-sync';
import { State } from 'ts-fsrs';

export function enableTextbookVocabularySync(userId: string | null) {
  if (!userId) {
    console.log('⚠️ No user ID - sync disabled');
    return;
  }

  console.log('🔄 Enabling Firebase sync for Textbook Vocabulary...');
  
  // Create sync instance
  const firebaseSync = new TextbookVocabularyFirebaseSync(userId);
  
  // Get the service instance
  const service = new TextbookVocabularyService(userId);
  
  // Patch the service to add sync capabilities
  const originalInit = service.init.bind(service);
  const originalRecordReview = service.recordReview.bind(service);
  
  // Override init to load from Firebase first
  service.init = async function() {
    await originalInit();
    
    try {
      // Load remote states
      const remoteStates = await firebaseSync.loadFromFirebase();
      
      if (remoteStates.size > 0) {
        console.log(`📥 Loaded ${remoteStates.size} review states from Firebase`);
        
        // Merge with local states
        const localStates = await this.getAllReviewStates();
        
        for (const [cardId, remoteState] of remoteStates) {
          const localState = localStates[cardId];
          
          if (!localState || remoteState.last_review > localState.last_review) {
            // Use remote state if local doesn't exist or remote is newer
            await this.storage.setReviewState(cardId, remoteState);
          }
        }
      }
      
      // Start real-time sync listener
      firebaseSync.initRealtimeSync(async (changes) => {
        console.log(`📨 Received ${changes.length} remote changes`);
        
        for (const change of changes) {
          const localState = await this.storage.getReviewState(change.cardId);
          
          if (!localState || change.lastReview.getTime() > localState.last_review) {
            // Apply remote change
            const state = new State();
            state.card_id = change.cardId;
            state.state = change.state;
            state.due = change.due;
            state.stability = change.stability;
            state.difficulty = change.difficulty;
            state.elapsed_days = change.elapsedDays;
            state.scheduled_days = change.scheduledDays;
            state.reps = change.reps;
            state.lapses = change.lapses;
            state.last_review = change.lastReview.getTime();
            
            await this.storage.setReviewState(change.cardId, state);
          }
        }
      });
      
    } catch (error) {
      console.error('⚠️ Firebase sync init failed (will continue with local only):', error);
    }
    
    return this;
  };
  
  // Override recordReview to sync after each review
  service.recordReview = async function(cardId: string, reviewData: any) {
    const result = await originalRecordReview(cardId, reviewData);
    
    try {
      // Sync the updated state to Firebase
      const state = await this.storage.getReviewState(cardId);
      if (state) {
        await firebaseSync.syncToFirebase([state]);
      }
    } catch (error) {
      console.error('⚠️ Firebase sync failed (review saved locally):', error);
    }
    
    return result;
  };
  
  // Add sync status method
  (service as any).getSyncStatus = async function() {
    const status = await firebaseSync.getSyncStatus();
    const localStates = await this.getAllReviewStates();
    status.localCount = Object.keys(localStates).length;
    return status;
  };
  
  // Add manual sync method
  (service as any).syncNow = async function() {
    console.log('⏳ Manual sync triggered...');
    const localStates = await this.getAllReviewStates();
    const statesMap = new Map(Object.entries(localStates));
    const merged = await firebaseSync.fullSync(statesMap);
    
    // Update local with merged states
    for (const [cardId, state] of merged) {
      await this.storage.setReviewState(cardId, state);
    }
    
    console.log('✅ Manual sync complete');
    return { synced: merged.size };
  };
  
  console.log('✅ Firebase sync enabled for Textbook Vocabulary');
  
  return service;
}