# Entitlements System Test Plan

## Test Environment Setup

### Required Test Accounts
1. **Guest User** - Browse without logging in
2. **Free User** - Create a new account or use existing free account
3. **Premium User** - Use existing premium account or upgrade a test account

### Browser Setup
- Clear localStorage before each test session
- Use incognito/private mode for guest testing
- Check browser console for any errors

## Test Scenarios

### 🧑 Guest User Tests

#### 1. Games (Separate limits for each game)
##### KanjiQuest
- [ ] Start KanjiQuest game
- [ ] Complete 3 games successfully
- [ ] On 4th game attempt, should see login prompt: "You've reached your daily game limit (3/3)! Sign up to play more games and save your progress."
- [ ] Verify KanjiQuest counter shows "3 games remaining today" initially

##### KanaDrop
- [ ] Start KanaDrop game (separate from KanjiQuest limit)
- [ ] Complete 3 games successfully
- [ ] On 4th game attempt, should see login prompt
- [ ] Verify KanaDrop has its own counter (3 games per day)

#### 2. Drills
- [ ] Navigate to /drill
- [ ] Complete 3 drill sessions
- [ ] On 4th drill attempt, should see login prompt
- [ ] Verify drill counter shows correct remaining drills

#### 3. Stories
- [ ] Navigate to /stories
- [ ] Read 3 stories
- [ ] On 4th story click, should see login prompt: "You've reached your daily story limit (3/3)!"
- [ ] Verify story counter displays correctly

#### 4. Articles
- [ ] Navigate to /news
- [ ] Read 3 articles
- [ ] On 4th article click, should see login prompt
- [ ] Verify "3 articles remaining today" displays initially

#### 5. Lists & Bookmarks
- [ ] Verify cannot create lists (no create button visible)
- [ ] Verify cannot bookmark articles or stories

### 👤 Free User Tests

#### 1. Games (Separate limits for each game)
- [ ] KanjiQuest: Complete 3 games, see upgrade prompt on 4th
- [ ] KanaDrop: Complete 3 games separately, see upgrade prompt on 4th
- [ ] Verify each game tracks its own usage
- [ ] Verify usage persists across sessions for both games

#### 2. Drills (Same limits as guest)
- [ ] Complete 3 drills
- [ ] Verify upgrade prompt shows on 4th attempt
- [ ] Check /practice page shows "3 drill questions per day"

#### 3. Stories & Articles
- [ ] Same as guest but with upgrade prompts instead of login prompts
- [ ] Verify progress is saved

#### 4. Lists
- [ ] Create 3 vocabulary lists
- [ ] On 4th list creation, should see: "You've reached your list limit (3/3)! Upgrade to Premium for unlimited vocabulary lists."
- [ ] Verify existing lists can still be edited

#### 5. Bookmarks
- [ ] Bookmark 5 articles/stories
- [ ] On 6th bookmark attempt, should see limit message
- [ ] Verify can remove and re-add bookmarks

### 💎 Premium User Tests

#### 1. Unlimited Access
- [ ] Play more than 3 games - no limits
- [ ] Do more than 3 drills - no limits  
- [ ] Read unlimited stories - no limits
- [ ] Read unlimited articles - no limits
- [ ] Create more than 3 lists - no limits
- [ ] Bookmark unlimited items - no limits

#### 2. UI Display
- [ ] Verify no limit counters shown
- [ ] Verify no upgrade prompts appear
- [ ] Check all features show as "unlimited"

### 🔄 Daily Reset Tests

#### 1. Manual Date Change Test
- [ ] As guest/free user, use up daily limits
- [ ] Change system date to next day
- [ ] Refresh page
- [ ] Verify counters reset to 0
- [ ] Verify can use features again

#### 2. localStorage Persistence
- [ ] Use some daily limits
- [ ] Close and reopen browser
- [ ] Verify usage counts persist
- [ ] Verify limits still enforced

### 🔧 Edge Cases

#### 1. Subscription Changes
- [ ] Upgrade from free to premium mid-day
- [ ] Verify limits immediately removed
- [ ] Downgrade from premium to free
- [ ] Verify limits immediately enforced

#### 2. Error Handling
- [ ] Test with network offline
- [ ] Verify graceful degradation
- [ ] Test with Firebase errors
- [ ] Verify limits still enforced locally

## Verification Checklist

### Code Verification
- [ ] No console errors during normal usage
- [ ] All API calls succeed
- [ ] Usage tracking increments properly
- [ ] Limits enforce at correct thresholds

### UI Verification  
- [ ] Limit displays update in real-time
- [ ] Modals show correct messages
- [ ] Buttons disable at limits
- [ ] Premium UI shows no limits

### Data Verification
- [ ] Check Firestore for correct usage data
- [ ] Verify localStorage for guest data
- [ ] Confirm subscription status matches UI

## Bug Report Template

If you find any issues, document them with:

```
**Issue**: [Brief description]
**User Type**: Guest / Free / Premium  
**Feature**: Games / Drills / Stories / Articles / Lists
**Expected**: [What should happen]
**Actual**: [What actually happened]
**Steps to Reproduce**:
1. 
2. 
3.
**Console Errors**: [Any errors from browser console]
```

## Test Results Summary

| Feature | Guest | Free | Premium | Notes |
|---------|-------|------|---------|-------|
| KanjiQuest | ⬜ | ⬜ | ⬜ | 3/day limit |
| KanaDrop | ⬜ | ⬜ | ⬜ | 3/day limit (separate) |
| Drills | ⬜ | ⬜ | ⬜ | |
| Stories | ⬜ | ⬜ | ⬜ | |
| Articles | ⬜ | ⬜ | ⬜ | |
| Lists | ⬜ | ⬜ | ⬜ | |
| Daily Reset | ⬜ | ⬜ | N/A | |

**Test Date**: ___________
**Tested By**: ___________
**Overall Status**: ⬜ Pass / ⬜ Fail