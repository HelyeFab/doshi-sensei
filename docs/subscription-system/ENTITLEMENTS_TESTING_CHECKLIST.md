# Entitlements System Testing Checklist

## Overview
This document provides a comprehensive testing checklist for the entitlements system migration. Each test should be performed for all user types: Guest, Free, and Premium (Monthly/Yearly).

## Testing Environment Setup

### 1. Clear Browser State
- Clear all cookies and localStorage
- Use incognito/private browsing mode for clean tests
- Clear IndexedDB data if necessary

### 2. Test User Accounts
- **Guest**: No login required
- **Free**: Create test account without subscription
- **Premium**: Use test account with active subscription

## Phase 1: Guest User Testing

### Games
- [ ] **KanjiQuest**
  - [ ] Can play up to 3 games per day
  - [ ] Shows correct limit (0/3, 1/3, etc.)
  - [ ] Blocks 4th attempt with login prompt
  - [ ] Counter resets at midnight

- [ ] **KanaDrop**
  - [ ] Has separate 3 games/day limit
  - [ ] Shows correct limit independent of KanjiQuest
  - [ ] Blocks 4th attempt with login prompt
  - [ ] Counter resets at midnight

### Learning Features
- [ ] **Drills**
  - [ ] Can do up to 3 drills per day
  - [ ] Shows correct limit (0/3, 1/3, etc.)
  - [ ] Blocks 4th attempt with login prompt
  - [ ] Counter resets at midnight

- [ ] **Articles**
  - [ ] Can read up to 3 articles per day
  - [ ] Shows correct limit
  - [ ] Blocks 4th article with login prompt
  - [ ] Counter resets at midnight

- [ ] **Stories**
  - [ ] Cannot access stories (guest limitation)
  - [ ] Shows login prompt immediately

### Storage Features
- [ ] **Lists**
  - [ ] Cannot create lists
  - [ ] Shows login prompt when attempting

- [ ] **Bookmarks**
  - [ ] Cannot save bookmarks
  - [ ] Shows login prompt when attempting

- [ ] **Progress Saving**
  - [ ] Cannot save progress
  - [ ] Warning shown about temporary session

## Phase 2: Free User Testing

### Games
- [ ] **KanjiQuest**
  - [ ] Can play up to 3 games per day
  - [ ] Shows correct limit
  - [ ] Blocks 4th attempt with upgrade prompt
  - [ ] Counter persists across sessions
  - [ ] Counter resets at midnight

- [ ] **KanaDrop**
  - [ ] Has separate 3 games/day limit
  - [ ] Independent tracking from KanjiQuest
  - [ ] Shows upgrade prompt at limit

### Learning Features
- [ ] **Drills**
  - [ ] Can do up to 3 drills per day
  - [ ] Progress saves to cloud
  - [ ] Shows upgrade prompt at limit

- [ ] **Articles**
  - [ ] Can read up to 3 articles per day
  - [ ] Reading history tracked
  - [ ] Shows upgrade prompt at limit

- [ ] **Stories**
  - [ ] Can read up to 3 stories per day
  - [ ] Progress saves
  - [ ] Shows upgrade prompt at limit

### Storage Features
- [ ] **Lists**
  - [ ] Can create up to 3 lists total
  - [ ] Shows current count (1/3, 2/3, etc.)
  - [ ] Blocks 4th list with upgrade prompt

- [ ] **Bookmarks**
  - [ ] Can save up to 5 bookmarks total
  - [ ] Shows current count
  - [ ] Blocks 6th bookmark with upgrade prompt

## Phase 3: Premium User Testing

### Games
- [ ] **KanjiQuest**
  - [ ] Unlimited plays
  - [ ] No daily limit shown
  - [ ] No upgrade prompts

- [ ] **KanaDrop**
  - [ ] Unlimited plays
  - [ ] No daily limit shown
  - [ ] No upgrade prompts

### Learning Features
- [ ] **Drills**
  - [ ] Unlimited drills
  - [ ] All features unlocked
  - [ ] No limit displays

- [ ] **Articles**
  - [ ] Unlimited article access
  - [ ] No "articles remaining" message
  - [ ] No upgrade prompts

- [ ] **Stories**
  - [ ] Unlimited story access
  - [ ] All stories available
  - [ ] No upgrade prompts

### Storage Features
- [ ] **Lists**
  - [ ] Unlimited lists
  - [ ] No count shown
  - [ ] Can create without limits

- [ ] **Bookmarks**
  - [ ] Unlimited bookmarks
  - [ ] No count shown
  - [ ] Can save without limits

### Premium Features
- [ ] **Cloud Sync**
  - [ ] Automatic sync enabled
  - [ ] Cross-device access works

- [ ] **Advanced Stats**
  - [ ] Full statistics visible
  - [ ] Learning analytics available

## Phase 4: Edge Cases & Regression Testing

### Date Change Testing
- [ ] **Midnight Reset**
  - [ ] Daily counters reset at local midnight
  - [ ] Previous day's usage not counted
  - [ ] Immediate access after reset

### Race Condition Testing
- [ ] **Page Load**
  - [ ] Premium users not blocked during loading
  - [ ] Correct limits after full load
  - [ ] No flickering between states

### Data Persistence
- [ ] **Guest to Free Migration**
  - [ ] Usage counts preserved on signup
  - [ ] No double counting

- [ ] **Free to Premium Upgrade**
  - [ ] Immediate unlimited access
  - [ ] Previous limits removed

### Error Handling
- [ ] **Network Errors**
  - [ ] Graceful fallback
  - [ ] Local data used when offline
  - [ ] No access blocking due to network

## Testing Commands

### Console Commands for Debugging
```javascript
// Check current entitlements
const { userType, canReadArticle, isPremium } = useEntitlements();
console.log({ userType, articleCheck: canReadArticle(), isPremium });

// Check subscription state
console.log('Subscription:', userSubscription);
console.log('User Type:', userType);
console.log('Is Premium:', isPremium);

// Check usage counters
console.log('Current Usage:', userSubscription?.currentUsage);
console.log('Guest Usage:', guestUsage);
```

### Manual State Reset
```javascript
// Clear guest usage
localStorage.removeItem('doshi_sensei_guest_usage');

// Force reload entitlements
window.location.reload();
```

## Known Issues to Verify Fixed

1. ✅ **Games sharing limits** - KanjiQuest and KanaDrop now have separate counters
2. ✅ **Premium users blocked** - Race condition fixed with loading state check
3. ✅ **Wrong limit displays** - Using entitlements system for consistent limits
4. ⚠️ **Article tracking** - Verify increment happens before navigation

## Success Criteria

- All limits enforced correctly per user type
- No premium users see limit warnings
- Daily resets work properly
- UI shows accurate counts
- Proper prompts (login vs upgrade)
- No console errors
- Smooth user experience

## Testing Log Template

```
Date: ___________
Tester: ___________
Browser: ___________
User Type: ___________

Issues Found:
1. 
2. 
3. 

Notes:
```