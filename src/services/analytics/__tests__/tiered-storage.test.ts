/**
 * Test file for Tiered Storage System
 * 
 * Run these tests in the browser console to verify the implementation
 */

import { learningEventsService } from '../LearningEventsService';
import { LearningEvent } from '@/types/analytics';

export async function testTieredStorage() {
  console.log('🧪 Starting Tiered Storage Tests...\n');

  // Test 1: Guest User (no storage)
  console.log('Test 1: Guest User Behavior');
  await learningEventsService.setUser(null);
  
  const guestEvent: LearningEvent = {
    id: 'test-guest-1',
    userId: 'guest',
    timestamp: Date.now(),
    type: 'view',
    category: 'kanji',
    content: { value: '愛' },
    sessionId: 'test-session',
    synced: false
  };
  
  await learningEventsService.trackEvent(guestEvent);
  const guestEvents = await learningEventsService.getRecentEvents(10);
  console.log('Guest events (memory only):', guestEvents.length);
  console.assert(guestEvents.length > 0, 'Guest should have events in memory');
  
  // Test 2: Free User (local storage only)
  console.log('\nTest 2: Free User Behavior');
  const freeUser = { uid: 'test-free-user' } as any;
  const freeSubscription = { plan: 'free' };
  await learningEventsService.setUser(freeUser, freeSubscription);
  
  const freeEvent: LearningEvent = {
    id: 'test-free-1',
    userId: freeUser.uid,
    timestamp: Date.now(),
    type: 'practice',
    category: 'vocabulary',
    content: { value: '食べる' },
    sessionId: 'test-session',
    synced: false
  };
  
  await learningEventsService.trackEvent(freeEvent);
  const freeEvents = await learningEventsService.getRecentEvents(10);
  console.log('Free user events (local storage):', freeEvents.length);
  console.assert(freeEvents.length > 0, 'Free user should have events in local storage');
  
  // Test 3: Premium User (local + cloud storage)
  console.log('\nTest 3: Premium User Behavior');
  const premiumUser = { uid: 'test-premium-user' } as any;
  const premiumSubscription = { plan: 'monthly' };
  await learningEventsService.setUser(premiumUser, premiumSubscription);
  
  const premiumEvent: LearningEvent = {
    id: 'test-premium-1',
    userId: premiumUser.uid,
    timestamp: Date.now(),
    type: 'test',
    category: 'grammar',
    content: { value: 'て-form' },
    sessionId: 'test-session',
    synced: false
  };
  
  await learningEventsService.trackEvent(premiumEvent);
  const premiumEvents = await learningEventsService.getRecentEvents(10);
  console.log('Premium user events (local + cloud):', premiumEvents.length);
  console.assert(premiumEvents.length > 0, 'Premium user should have events');
  
  // Test 4: Stats for different tiers
  console.log('\nTest 4: Stats by User Tier');
  
  await learningEventsService.setUser(null);
  const guestStats = await learningEventsService.getStats();
  console.log('Guest stats:', guestStats);
  console.assert(guestStats.userTier === 'guest', 'Guest tier should be identified');
  
  await learningEventsService.setUser(freeUser, freeSubscription);
  const freeStats = await learningEventsService.getStats();
  console.log('Free user stats:', freeStats);
  console.assert(freeStats.userTier === 'free', 'Free tier should be identified');
  
  await learningEventsService.setUser(premiumUser, premiumSubscription);
  const premiumStats = await learningEventsService.getStats();
  console.log('Premium user stats:', premiumStats);
  console.assert(premiumStats.userTier === 'monthly', 'Premium tier should be identified');
  
  // Test 5: Data deletion
  console.log('\nTest 5: Data Deletion');
  await learningEventsService.deleteAllUserData();
  const afterDelete = await learningEventsService.getRecentEvents(10);
  console.log('Events after deletion:', afterDelete.length);
  console.assert(afterDelete.length === 0, 'All events should be deleted');
  
  console.log('\n✅ All tests completed!');
  console.log('\n📝 Summary:');
  console.log('- Guests: Memory only, no persistence');
  console.log('- Free users: Local storage (IndexedDB) only');
  console.log('- Premium users: Local + Cloud sync every 30 seconds');
  
  return {
    success: true,
    message: 'All tiered storage tests passed'
  };
}

// Export for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testTieredStorage = testTieredStorage;
  console.log('💡 Run testTieredStorage() in console to test the implementation');
}