# Subscription System V2 - Testing Checklist

## 🧪 Manual Testing Guide

### Prerequisites
- Dev server running (`npm run dev`)
- Access to Firebase Console
- Test with 3 different user states: Guest, Free, Premium

### 1. Guest User Testing (Not Logged In)
- [ ] **Games Access**
  - [ ] Can play KanjiQuest up to 3 times per day
  - [ ] Can play KanaDrop up to 3 times per day
  - [ ] Shows "Login Required" modal after limit reached
  - [ ] Usage counter displays correctly (e.g., "2/3 plays today")

- [ ] **Articles/News**
  - [ ] Can read up to 3 articles per day
  - [ ] Shows login prompt after limit

- [ ] **Drill Practice**
  - [ ] Can do 3 drills per day
  - [ ] Progress is not saved

- [ ] **Lists/Bookmarks**
  - [ ] Cannot create lists (shows login prompt)
  - [ ] Cannot bookmark articles

### 2. Free User Testing (Logged In - Free Account)
- [ ] **Games Access**
  - [ ] Can play KanjiQuest up to 3 times per day
  - [ ] Can play KanaDrop up to 3 times per day
  - [ ] Shows "Upgrade Required" modal after limit
  - [ ] Usage persists across sessions

- [ ] **Articles/News**
  - [ ] Can read up to 3 articles per day
  - [ ] Can bookmark up to 5 articles
  - [ ] Shows upgrade prompt after limits

- [ ] **Lists**
  - [ ] Can create up to 3 word lists
  - [ ] Cannot use cloud sync
  - [ ] Lists saved locally only

- [ ] **Drill Practice**
  - [ ] Can do 3 drills per day
  - [ ] Progress is saved

### 3. Premium User Testing (Monthly/Yearly)
- [ ] **Unlimited Access**
  - [ ] ✅ Unlimited KanjiQuest plays
  - [ ] ✅ Unlimited KanaDrop plays
  - [ ] ✅ Unlimited articles
  - [ ] ✅ Unlimited drills
  - [ ] ✅ Unlimited lists
  - [ ] ✅ Unlimited bookmarks

- [ ] **Premium Features**
  - [ ] ✅ Cloud sync enabled
  - [ ] ✅ All features show as "Unlimited"
  - [ ] ✅ No upgrade prompts shown
  - [ ] ✅ Usage counters show "Unlimited" or don't appear

### 4. User State Transitions
- [ ] **Guest → Free**
  - [ ] Login preserves guest usage counts
  - [ ] Limits update correctly

- [ ] **Free → Premium**
  - [ ] All limits immediately become unlimited
  - [ ] Previous usage doesn't affect access

- [ ] **Premium → Free (Cancellation)**
  - [ ] Limits revert to free tier
  - [ ] Existing data preserved but limited

### 5. Modal Testing
- [ ] **Login Modal**
  - [ ] Shows for guests when hitting limits
  - [ ] Correct messaging displayed
  - [ ] Can close and continue as guest

- [ ] **Upgrade Modal**
  - [ ] Shows for free users at limits
  - [ ] Displays correct pricing ($3.99/mo or $39.99/yr)
  - [ ] Stripe checkout works correctly

### 6. Admin Features
- [ ] **Feature Matrix (/admin/features)**
  - [ ] Shows all features and limits
  - [ ] Can edit limits dynamically
  - [ ] Changes take effect immediately

### 7. Special Cases
- [ ] **Bruno's Account (bruno.giogoli@gmail.com)**
  - [ ] ✅ Shows as monthly subscriber
  - [ ] ✅ Has unlimited access
  - [ ] ✅ Stripe customer ID linked

- [ ] **Admin Account (emmanuelfabiani23@gmail.com)**
  - [ ] ✅ Shows as yearly subscriber
  - [ ] ✅ Has admin dashboard access
  - [ ] ✅ Unlimited everything

### 8. Technical Verification
- [ ] **Browser Console**
  - [ ] No errors about undefined subscriptions
  - [ ] No warnings about missing contexts
  - [ ] Clean console output

- [ ] **Network Tab**
  - [ ] No failed API calls
  - [ ] Subscription data loads correctly

### 9. Edge Cases
- [ ] **Offline Mode**
  - [ ] App still works without internet
  - [ ] Shows appropriate offline messages

- [ ] **Session Timeout**
  - [ ] Handles auth session expiry gracefully
  - [ ] Re-authenticates without data loss

## 🎯 Expected Results

### ✅ Success Criteria
1. All user types have correct access levels
2. Limits are enforced properly
3. Modals show at appropriate times
4. No console errors
5. Smooth user experience
6. Bruno has premium access
7. Admin can edit limits dynamically

### ❌ Known Issues to Watch For
1. ~~Old subscription structure causing issues~~ - FIXED
2. ~~SubscriptionContext undefined errors~~ - FIXED
3. ~~Wrong modals showing~~ - FIXED

## 📝 Notes
- Test in incognito mode for clean guest testing
- Use different browsers for different user types
- Check Firebase Console for correct data structure
- Verify Stripe webhooks are working (check webhook logs)