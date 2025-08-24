# Browser Popup Migration Guide

## Overview
This document tracks the migration from browser popups (`alert()`, `confirm()`, `prompt()`) to custom UI components.

## Summary of Findings

### Alert() Usage - 100+ instances found!
- **Critical User-Facing**: 10+ in main app components
- **Admin Dashboard**: 70+ in admin components
- **Debugging/Testing**: 20+ in debug panels

### Confirm() Usage - 30+ instances found
- **Data Deletion**: Database clearing, stats deletion
- **Admin Operations**: Migration, cleanup scripts
- **User Actions**: History clearing, progress reset

### Prompt() Usage - 4 instances found
- **Account Deletion**: Password confirmation
- **PWA Install**: Browser API (cannot be replaced)

## Components to Use Instead

### For Alerts → Use Toast or AlertBanner
```tsx
// Instead of:
alert('Operation successful!');

// Use:
toast.success('Operation successful!');
// or
<AlertBanner type="success" message="Operation successful!" />
```

### For Confirms → Use ConfirmDialog
```tsx
// Instead of:
if (confirm('Are you sure?')) { ... }

// Use:
const { showDialog } = useConfirmDialog();
showDialog({
  title: 'Confirm Action',
  message: 'Are you sure?',
  onConfirm: () => { ... }
});
```

### For Prompts → Use Custom Modal/Form
```tsx
// Instead of:
const input = prompt('Enter value:');

// Create a custom modal with an input field
```

## Priority Migration List

### HIGH PRIORITY - User-Facing Components
1. ✅ `/src/app/test-pwa-notifications/page.tsx` - DONE
2. `/src/components/kanji-moods/KanjiCard.tsx` - Line 72
3. `/src/components/kanji-moods/KanjiModal.tsx` - Line 235
4. `/src/components/VirtualCompanion.tsx` - Line 273 (PWA install)
5. `/src/components/DonationModal.tsx` - Lines 31, 38
6. `/src/components/vocabulary/ExampleSentencesBlock.tsx` - Line 28
7. `/src/app/vocabulary/VocabularyPage.tsx` - Line 325
8. `/src/app/vocabulary/VocabularyClient.tsx` - Line 279
9. `/src/app/popular-videos/PopularVideosEnhanced.tsx` - Lines 280, 287
10. `/src/contexts/AuthContext.tsx` - Line 270 (password prompt)

### MEDIUM PRIORITY - Admin Components
- Most admin components can continue using alerts temporarily since they're internal tools
- Gradually migrate to Toast/ConfirmDialog as time permits

### LOW PRIORITY - Debug/Test Components
- Debug panels can keep using alerts as they're developer tools

## Migration Status

| Component | Alert | Confirm | Prompt | Status |
|-----------|-------|---------|--------|--------|
| PWA Test Page | ✅ | - | - | Complete |
| Kanji Components | ❌ | - | - | Pending |
| Virtual Companion | ❌ | - | - | Pending |
| Donation Modal | ❌ | - | - | Pending |
| Vocabulary | ❌ | ❌ | - | Pending |
| Auth Context | - | - | ❌ | Pending |

## Implementation Examples

### Example 1: Kanji Card Migration
```tsx
// Before:
if (!user) {
  alert('Please sign in to save kanji');
  return;
}

// After:
import { useToast } from '@/hooks/useToast';

const { toast } = useToast();

if (!user) {
  toast.warning('Please sign in to save kanji');
  return;
}
```

### Example 2: Vocabulary Clear History
```tsx
// Before:
if (confirm('Are you sure you want to clear all search history?')) {
  clearHistory();
}

// After:
const { showDialog } = useConfirmDialog();

showDialog({
  title: 'Clear Search History',
  message: 'Are you sure you want to clear all search history? This cannot be undone.',
  type: 'warning',
  onConfirm: () => clearHistory()
});
```

### Example 3: Password Prompt
```tsx
// Before:
const password = prompt('Please enter your password:');

// After:
// Create a PasswordConfirmModal component
<PasswordConfirmModal
  isOpen={showPasswordModal}
  onConfirm={(password) => handleDelete(password)}
  onCancel={() => setShowPasswordModal(false)}
/>
```

## Next Steps

1. Start with HIGH PRIORITY user-facing components
2. Create reusable patterns for common use cases
3. Test each migration thoroughly
4. Update this document as migrations complete