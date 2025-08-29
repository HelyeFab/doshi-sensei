# Unified Review Hub - Manual Testing Guide

## Overview

This document provides comprehensive manual testing procedures for the Unified Review Hub system. The guide covers all features, user flows, and edge cases to ensure the system works correctly across all scenarios.

## Test Environment Setup

### Prerequisites
- Development environment running locally
- Test user accounts with different subscription tiers:
  - Guest user (not logged in)
  - Free user account
  - Premium user account
- Test data in various review sources:
  - Textbook Vocabulary items
  - Kanji Mastery items
  - Custom Flashcards

### Test Data Requirements
- At least 50 items across different sources
- Items with various due dates (overdue, today, future)
- Items with different priority levels
- Items with different content types (vocabulary, kanji, etc.)

## Testing Checklist

### 1. Initial Loading and Hub Display

#### ✅ Hub Loading
- [ ] Page loads without errors
- [ ] Loading spinner appears during initialization
- [ ] Hub displays after loading completes
- [ ] No console errors or warnings
- [ ] Network requests complete successfully

#### ✅ Header and Navigation
- [ ] "Review Hub" title displays correctly
- [ ] "Unified spaced repetition system" subtitle shows
- [ ] Settings gear icon appears in top-right
- [ ] Back navigation works (if applicable)

#### ✅ Aggregated Statistics Display
- [ ] "Today's Overview" section appears
- [ ] Due Today count is accurate
- [ ] Study Streak displays current streak
- [ ] Retention percentage is calculated correctly
- [ ] Total Items count matches sum of all sources
- [ ] Overdue count appears when applicable (red text)

### 2. Review Source Management

#### ✅ Source Cards Display
- [ ] All registered sources appear as cards
- [ ] Source icons display correctly (📖, 🈳, 🎯, etc.)
- [ ] Source names are clear and readable
- [ ] Source descriptions provide helpful context
- [ ] Priority badges show correct level and color
- [ ] Due/Total/Rate stats are accurate per source

#### ✅ Source Card Interactions
- [ ] Hover effects work smoothly
- [ ] Click navigates to source main page
- [ ] Return path is stored in session storage
- [ ] URL includes `?returnTo=/review` parameter
- [ ] Preview items show next 3 due items
- [ ] "+X more" indicator when >3 items

#### ✅ Priority Management Mode
- [ ] "Manage Priorities" button enters edit mode
- [ ] "Done" button exits edit mode
- [ ] "Drag to reorder priority" instruction appears
- [ ] Toggle switches show current enabled state
- [ ] Priority dropdowns show current priority
- [ ] Drag handles appear for reordering
- [ ] Cards become non-clickable during edit

### 3. Priority and Source Control

#### ✅ Toggle Source Enable/Disable
- [ ] Click toggle switches source on/off
- [ ] Disabled sources show opacity reduction
- [ ] Disabled sources show "Source disabled" message
- [ ] Stats update immediately after toggle
- [ ] Registry receives setSourceEnabled call

#### ✅ Priority Level Changes
- [ ] Priority dropdown shows all levels (🔴 Urgent, 🟠 High, etc.)
- [ ] Selection changes priority badge immediately
- [ ] Priority colors update correctly
- [ ] Registry receives updateSourcePriority call
- [ ] Source reordering reflects new priorities

#### ✅ Drag and Drop Reordering
- [ ] Cards can be dragged in edit mode
- [ ] Drop zones highlight appropriately
- [ ] Cards reorder visually during drag
- [ ] Final order persists after edit mode exit
- [ ] Order changes affect actual review priority

### 4. Review Session Management

#### ✅ Start Review Functionality
- [ ] "Start Review (X)" button shows correct count
- [ ] Button is enabled when items are due
- [ ] Button is disabled when no items due
- [ ] Click navigates to review session
- [ ] Session parameters are passed correctly
- [ ] Return path is stored for navigation back

#### ✅ Session Preferences
- [ ] Maximum items limit is respected
- [ ] Content type filters work correctly
- [ ] Study mode preferences are applied
- [ ] New items inclusion setting works
- [ ] New items limit is enforced

#### ✅ Session Return Navigation
- [ ] Completion returns to Review Hub
- [ ] Cancellation returns to Review Hub
- [ ] Return path is cleared from session storage
- [ ] URL parameters are cleaned up
- [ ] Hub refreshes with updated stats

### 5. Golden Time Features

#### ✅ Golden Time Detection
**Morning Golden Time (7:00 AM - 10:00 AM):**
- [ ] Golden Time indicator appears
- [ ] Shows "🌅 Golden Time" badge
- [ ] Displays correct bonus multiplier (1.2×)
- [ ] Badge has amber/orange styling

**Evening Golden Time (6:00 PM - 9:00 PM):**
- [ ] Golden Time indicator appears
- [ ] Shows correct evening styling
- [ ] Bonus multiplier is accurate

**Outside Golden Time:**
- [ ] No Golden Time badge appears
- [ ] Next window information shows correctly
- [ ] Time format is readable (HH:MM)
- [ ] Morning/evening label is accurate

#### ✅ Golden Time Benefits
- [ ] Review multiplier affects scoring
- [ ] Visual feedback encourages usage
- [ ] Next window countdown is accurate

### 6. Notification Settings

#### ✅ Settings Modal
- [ ] Settings gear icon opens modal
- [ ] Modal displays "Notification Settings" title
- [ ] Close (X) button closes modal
- [ ] Click outside modal closes it
- [ ] Modal animations are smooth

#### ✅ Notification Options
- [ ] "Daily review reminders" checkbox
- [ ] "Golden time notifications" checkbox  
- [ ] "Achievement alerts" checkbox
- [ ] Checkboxes maintain state correctly
- [ ] Settings persist between sessions

#### ✅ Premium Upgrade Integration
**Free Users:**
- [ ] Upgrade prompt appears in modal
- [ ] Blue background with proper styling
- [ ] "🔄 Upgrade to Premium" message shows
- [ ] Cross-device sync mention is clear

**Premium Users:**
- [ ] No upgrade prompt appears
- [ ] All notification options available
- [ ] Advanced scheduling options work

### 7. Access Control and Premium Features

#### ✅ Subscription Tier Display
**Guest/Free Users:**
- [ ] "Upgrade for sync →" link appears
- [ ] Link points to `/subscription` page
- [ ] Upgrade prompts appear appropriately
- [ ] Feature limitations are clear

**Premium Users:**
- [ ] No upgrade prompts appear
- [ ] Full feature access granted
- [ ] Sync status indicators show
- [ ] Premium-only features are available

#### ✅ Usage Limits
**Free Users:**
- [ ] Daily review limits enforced
- [ ] Limit reached notifications appear
- [ ] Upgrade prompts show when limited
- [ ] LocalStorage usage is tracked

**Premium Users:**
- [ ] No usage limits applied
- [ ] Firebase sync operates correctly
- [ ] Cross-device sync works
- [ ] Usage tracking for analytics only

### 8. Learning Insights and Analytics

#### ✅ Insights Section Display
- [ ] "Learning Insights" section appears
- [ ] Recommendations list is populated
- [ ] Info icons appear for each recommendation
- [ ] Gray background styling is correct
- [ ] Text is readable and helpful

#### ✅ Recommendation Content
- [ ] Struggling areas are identified correctly
- [ ] Study time suggestions are relevant
- [ ] Golden time recommendations appear
- [ ] Content type focus suggestions show
- [ ] Next review estimate is accurate

#### ✅ Performance Trends
- [ ] Accuracy trends are calculated correctly
- [ ] Speed improvements are tracked
- [ ] Retention trends show properly
- [ ] Source-specific insights appear

### 9. Error Handling and Edge Cases

#### ✅ Network and Loading Errors
**Registry Initialization Failure:**
- [ ] Error message appears clearly
- [ ] "Error Loading Review Hub" title shows
- [ ] Specific error message displays
- [ ] "Retry" button triggers reload
- [ ] Error styling (red background) is correct

**Data Loading Failures:**
- [ ] Partial loading handles gracefully
- [ ] Missing stats show as 0 or "—"
- [ ] Error indicators appear for failed sources
- [ ] Retry mechanisms work correctly

**Source Health Check Failures:**
- [ ] Unhealthy sources marked clearly
- [ ] Error status indicators appear
- [ ] Health check retry mechanisms work
- [ ] User guidance for fixing issues

#### ✅ Empty State Handling
**No Due Items:**
- [ ] "Start Review" button is disabled
- [ ] Empty state message is encouraging
- [ ] Suggests when next items are due
- [ ] Maintains all other functionality

**No Sources Registered:**
- [ ] Empty sources message appears
- [ ] Instructions for adding sources
- [ ] Navigation to source setup
- [ ] Graceful degradation of features

**No Data Available:**
- [ ] Loading states persist appropriately
- [ ] Skeleton screens show where applicable
- [ ] Error boundaries catch rendering issues
- [ ] Fallback content is meaningful

### 10. Real-time Updates and Events

#### ✅ Source Update Events
**Items Updated:**
- [ ] Stats refresh automatically
- [ ] Due counts update immediately
- [ ] No page reload required
- [ ] Smooth visual transitions

**Config Changes:**
- [ ] Priority changes reflect instantly
- [ ] Enable/disable updates immediately
- [ ] Card reordering happens smoothly
- [ ] Registry state stays synchronized

**Status Changes:**
- [ ] Source health updates show
- [ ] Error states appear/clear correctly
- [ ] Loading states manage properly
- [ ] User feedback is immediate

#### ✅ Event Cleanup
- [ ] Event listeners are removed on unmount
- [ ] No memory leaks occur
- [ ] Registry cleanup happens properly
- [ ] Component disposal is complete

### 11. Mobile Responsiveness

#### ✅ Mobile Layout (< 768px)
- [ ] Single column source cards
- [ ] Touch targets are appropriate size
- [ ] Scrolling works smoothly
- [ ] Modal dialogs fit screen properly
- [ ] Navigation remains accessible

#### ✅ Tablet Layout (768px - 1024px)
- [ ] Two column source cards
- [ ] Touch and mouse input both work
- [ ] Landscape orientation handles well
- [ ] Content is readable and accessible

#### ✅ Desktop Layout (> 1024px)
- [ ] Three column source cards
- [ ] Hover states work correctly
- [ ] Keyboard navigation functions
- [ ] Window resizing handles gracefully

### 12. Accessibility Testing

#### ✅ Keyboard Navigation
- [ ] Tab order is logical
- [ ] All interactive elements are reachable
- [ ] Enter/Space activate buttons
- [ ] Escape closes modals
- [ ] Focus indicators are visible

#### ✅ Screen Reader Compatibility
- [ ] Page structure is semantic
- [ ] ARIA labels are appropriate
- [ ] Live regions announce updates
- [ ] Form controls are properly labeled
- [ ] Images have meaningful alt text

#### ✅ Color and Contrast
- [ ] Color contrast meets WCAG AA standards
- [ ] Information not conveyed by color alone
- [ ] Focus indicators are high contrast
- [ ] Error states are clearly marked

### 13. Performance Testing

#### ✅ Loading Performance
- [ ] Initial page load < 3 seconds
- [ ] Registry initialization < 2 seconds
- [ ] Source loading parallelizes properly
- [ ] Images load efficiently
- [ ] Animations are smooth (60fps)

#### ✅ Memory Usage
- [ ] No obvious memory leaks
- [ ] Component cleanup happens properly
- [ ] Large datasets handle efficiently
- [ ] Event listeners are managed correctly

#### ✅ Network Efficiency
- [ ] API calls are batched appropriately
- [ ] Caching strategies work correctly
- [ ] Failed requests retry intelligently
- [ ] Offline behavior handles gracefully

## Test Scenarios and User Flows

### Scenario 1: New User First Visit
1. Navigate to `/review`
2. Verify loading state appears
3. Check empty state if no sources configured
4. Verify guidance for setting up sources
5. Test navigation to source configuration

### Scenario 2: Daily Review Session
1. Start from hub with due items
2. Click "Start Review" button
3. Complete review session
4. Return to hub
5. Verify stats update
6. Check golden time benefits if applicable

### Scenario 3: Source Priority Management
1. Enter priority edit mode
2. Disable low-priority source
3. Change priority levels
4. Reorder sources via drag
5. Exit edit mode
6. Verify changes persist
7. Test review session with new priorities

### Scenario 4: Cross-Device Premium Sync
1. Make changes on device A (premium user)
2. Wait for sync to complete
3. Check device B for updated data
4. Verify consistency across devices
5. Test conflict resolution if applicable

### Scenario 5: Error Recovery
1. Simulate network failure during loading
2. Verify error state displays
3. Test retry mechanism
4. Simulate partial source failures
5. Verify graceful degradation

## Browser and Device Testing

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Browsers
- [ ] Chrome Mobile (Android)
- [ ] Safari Mobile (iOS)
- [ ] Firefox Mobile
- [ ] Samsung Internet

### Device Types
- [ ] Desktop (1920×1080 and higher)
- [ ] Laptop (1366×768, 1440×900)
- [ ] Tablet (iPad, Android tablets)
- [ ] Mobile (iPhone, Android phones)

## Automated Testing Verification

After manual testing, verify that:
- [ ] Integration tests pass
- [ ] Unit tests pass
- [ ] E2E tests pass (if available)
- [ ] Performance benchmarks are met
- [ ] Accessibility tests pass

## Reporting Issues

When issues are found during testing:

1. **Document the Issue:**
   - Clear description of expected vs actual behavior
   - Steps to reproduce
   - Browser/device information
   - Screenshots or videos if helpful

2. **Categorize Severity:**
   - **Critical:** Breaks core functionality
   - **High:** Significant user experience impact  
   - **Medium:** Minor functionality issue
   - **Low:** Cosmetic or edge case issue

3. **Provide Context:**
   - User type affected (guest/free/premium)
   - Specific review sources involved
   - Data conditions when issue occurs
   - Error messages or console output

## Testing Sign-off

When all test scenarios pass:
- [ ] All critical functionality works correctly
- [ ] Premium features are properly gated
- [ ] Error handling is comprehensive
- [ ] Performance is acceptable
- [ ] Accessibility requirements are met
- [ ] Cross-browser compatibility verified

**Tested by:** _______________  
**Date:** _______________  
**Version:** _______________  
**Sign-off:** _______________

---

## Additional Notes

- Test data should be refreshed regularly to avoid staleness
- Performance should be tested with realistic data volumes
- Edge cases like leap years, timezone changes should be considered
- Regular accessibility audits should be performed
- User feedback should be incorporated into test scenarios

This testing guide should be updated as new features are added or existing functionality changes.