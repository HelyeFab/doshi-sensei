# Implementation Notes - Subscription System Rebuild

**Created**: January 6, 2025  
**Purpose**: Track all implementation details, gotchas, and project-specific conventions

## 🎨 UI/UX Conventions

### Icons
- **DO NOT USE**: `lucide-react` or any icon libraries
- **USE**: Emojis throughout the project
- Examples:
  - Loading spinner: `⏳` with `animate-spin` class
  - Refresh: `🔄`
  - Download/Export: `📥`
  - Games: `🎮`
  - Learning: `📝`
  - System: `⚙️`

### Styling
- Project uses Tailwind CSS
- Dark mode aware (use `dark:` variants)
- Color conventions:
  - Success: `text-green-500`
  - Error: `text-red-500` or `text-destructive`
  - Warning: `text-yellow-500`
  - Info: `text-blue-500`

## 🔐 Authentication & Admin

### Firebase Admin SDK Issues
- **Problem**: Firebase Admin initialization can fail in serverless environments
- **Current Solution**: For static data (like feature matrix), skip authentication
- **TODO**: Properly initialize Firebase Admin for production
- **Files affected**:
  - `/src/app/api/admin/feature-matrix/route.ts` - Currently bypasses auth
  - `/src/lib/firebase-admin.ts` - Uses proxy pattern
  - `/src/lib/firebase-admin-safe.ts` - Safe initialization wrapper

### Admin Access
- Only 2 users in system (both admin)
- Admin check usually done via `userData?.isAdmin`
- Admin routes protected by:
  1. Client-side: `useAdmin()` hook check
  2. Server-side: Should verify admin status (currently simplified)

## 📁 Project Structure Patterns

### API Routes
- Location: `/src/app/api/`
- Use Next.js 13+ App Router conventions
- Return `NextResponse.json()` for JSON responses
- Error handling pattern:
  ```typescript
  try {
    // logic
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Context:', error);
    return NextResponse.json(
      { error: 'User-friendly message' },
      { status: 500 }
    );
  }
  ```

### Component Organization
- Admin components: `/src/components/admin/`
- Feature-specific subfolders (e.g., `feature-matrix/`)
- Use `'use client'` directive for client components

## 🐛 Known Issues & Workarounds

### 1. Subscription Data Structure Inconsistency
- **Problem**: 3 different structures in production
- **Temporary Fix**: Compatibility checks for all structures
- **Files with compatibility code**:
  - `/src/contexts/SubscriptionContext.tsx`
  - `/src/components/SubscriptionPlans.tsx`
- **TODO**: Migrate all users to single structure

### 2. User Count Simplification
- **Reality**: Only 2 users (both admin/owner)
- **Benefit**: Can do direct database edits
- **Simplified**: Migration plans, rollback procedures
- **Remember**: No need for gradual rollouts

### 3. Feature Registry Mappings
- **Important**: Features map to permissions via `permissionMap`
- **Location**: `/src/app/api/admin/feature-matrix/route.ts`
- Must keep in sync with:
  - Feature IDs in registry
  - Permission names in entitlements

## 🚀 Deployment Considerations

### Static Export
- App uses `next export` for static deployment
- Some features may not work in static mode
- API routes need serverless functions

### Environment Variables
- Check for proper environment variables
- Firebase credentials
- Stripe keys (when implementing payments)

## ✅ Testing Reminders

### Manual Testing Checklist
- [ ] Test with all user types (guest, free, monthly, yearly)
- [ ] Verify emoji display on all browsers
- [ ] Check dark mode appearance
- [ ] Test on mobile devices
- [ ] Verify feature matrix calculations

### Common Pitfalls
1. Forgetting `'use client'` directive
2. Using icon libraries instead of emojis
3. Not handling loading states
4. Assuming Firebase Admin is initialized

## 📝 Code Patterns to Follow

### Hooks Pattern
```typescript
// Standard return pattern
return {
  data,
  isLoading,
  error,
  refetch, // or refresh
  // derived states
  isAvailable: computed,
  canUse: computed
};
```

### Error Messages
- User-facing: Simple, actionable
- Console logs: Detailed with context
- Always log full error for debugging

### TypeScript
- Strict mode enabled
- Define all types/interfaces
- Avoid `any` type

## 🎯 Next Steps Tracking

### Completed
- [x] Core system architecture
- [x] TypeScript interfaces
- [x] Manager classes
- [x] React hooks
- [x] Admin feature matrix
- [x] Dynamic limits editing system

### TODO
- [ ] Add proper admin authentication to API routes
- [ ] Implement Stripe webhook handler
- [ ] Create user data migration script
- [ ] Add comprehensive tests
- [ ] Update existing components to use new system

## 📚 Documentation Updates Required

### High Priority - User-Facing Docs
- [ ] `/docs/FREEMIUM_SYSTEM_DOCUMENTATION.md`
  - Update static limit values to mention "configurable"
  - Add note about dynamic limits
  - Update screenshots if limits shown

- [ ] `/docs/USER_ENTITLEMENTS.md`
  - Update the visual guide with new limits
  - Change guest access (now includes stories/moods)
  - Update free user limits

### Medium Priority - Technical Docs
- [ ] `/docs/subscription-system/ENTITLEMENTS_SYSTEM.md`
  - Document dynamic rules system
  - Add section on editing limits via admin

- [ ] `/docs/subscription-system/README.md`
  - Add overview of dynamic limits feature
  - Link to admin feature matrix

- [ ] `/docs/CLAUDE.md`
  - Add feature matrix to admin features list
  - Document dynamic limits capability

### Low Priority - Reference Docs
- [ ] `/docs/subscription-system/PHASE_1_IMPLEMENTATION_CHECKLIST.md`
  - Mark dynamic limits as completed
  
- [ ] `/docs/subscription-system/SUBSCRIPTION_SYSTEM_REBUILD_PLAN.md`
  - Note that dynamic configuration was added

### New Documentation Needed
- [ ] Create `/docs/admin/FEATURE_MATRIX_GUIDE.md`
  - How to use the feature matrix
  - Best practices for setting limits
  - Business strategy tips

- [ ] Create `/docs/admin/DYNAMIC_LIMITS_STRATEGY.md`
  - When to adjust limits
  - A/B testing strategies
  - Conversion optimization tips

## 📝 Key Changes to Document

### Limit Changes
1. **Guest Users**:
   - OLD: No stories, no mood boards
   - NEW: 1 story/day, 1 mood board/day

2. **Free Users**:
   - OLD: 3 stories/day
   - NEW: 1 story/day, 1 mood board/day

3. **Dynamic Nature**:
   - ALL limits can now be changed via admin dashboard
   - No code changes needed to adjust limits
   - Changes apply immediately

### Features Added
1. **Admin Feature Matrix** (`/admin/features`)
   - View all features and limits
   - Edit mode for changing limits
   - Export to CSV/JSON

2. **Dynamic Rules System**
   - Stored in Firestore `config/entitlement_rules_v1`
   - Fallback to static rules if DB unavailable
   - Real-time updates without deployment

## 🔧 Quick Fixes Reference

### "Module not found: lucide-react"
- Replace with emoji
- Add animation classes directly

### "Firebase Admin initialization failed"
- Check if running in build vs runtime
- For static data, temporarily skip auth
- Use firebase-admin-safe wrapper

### "Cannot read property of undefined"
- Check for nested subscription structure
- Add compatibility checks
- Verify data exists before accessing

---

**Remember**: Document any new quirks or patterns discovered during implementation!