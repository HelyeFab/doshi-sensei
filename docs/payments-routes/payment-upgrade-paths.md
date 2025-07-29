# Payment and Upgrade Paths Documentation

This document outlines all the ways customers can upgrade from free to premium accounts in Doshi Sensei.

## Overview

Doshi Sensei uses Stripe for payment processing and offers two subscription tiers:
- **Monthly**: $3.99/month
- **Yearly**: $39.99/year (Save 17% - effectively 2 months free)

## Payment/Upgrade Paths

### 1. Feature Limit Modals (Primary Path)

**Component**: `UpgradeSlideUpModal` 
**Location**: `/src/components/UpgradeSlideUpModal.tsx`

This is the most common upgrade path, triggered automatically when users hit feature limits.

**Triggers**:
- Daily usage limits reached
- Attempting to access premium-only features
- Exceeding free tier restrictions (e.g., 3 word lists max)

**Features**:
- Shows both monthly and yearly options
- Displays premium benefits
- Analytics tracking for conversion funnel
- Smooth slide-up animation
- "Maybe Later" dismissal option

**Technical Flow**:
```typescript
// Triggered via useAccessWithModals hook
const { checkAndTrack, AccessModals } = useAccessWithModals();

// When limit reached:
// 1. Shows UpgradeSlideUpModal
// 2. User selects plan (monthly/yearly)
// 3. Calls createCheckoutSession(priceId)
// 4. Redirects to Stripe checkout
```

### 2. Account Page Subscription Management

**Component**: `SubscriptionPlans`
**Location**: `/src/components/SubscriptionPlans.tsx`
**Page**: `/account`

Direct upgrade path from the account settings page.

**Features**:
- Shows current plan status
- Displays detailed feature comparison
- Highlights "Best Value" for yearly plan
- Shows savings percentage
- Lists all premium benefits

**UI Elements**:
- Two-column grid layout (Monthly vs Yearly)
- Green success checkmarks for features
- Prominent upgrade buttons
- Warning box showing free plan limitations

### 3. Access Control Integration

**Hook**: `useAccessWithModals`
**Location**: `/src/hooks/useAccessWithModals.tsx`

Automated upgrade prompts integrated with the Three-Pillar Architecture.

**Trigger Scenarios**:
1. **Not Authenticated**: Shows login prompt modal
2. **Subscription Required**: Shows upgrade modal for premium features
3. **Limit Reached**: Shows upgrade modal with usage stats

**Example Implementation**:
```typescript
const { checkAndTrack, AccessModals } = useAccessWithModals();

// In component:
const handleFeatureAccess = async () => {
  const hasAccess = await checkAndTrack('premium_feature');
  if (hasAccess) {
    // Proceed with feature
  }
  // Modal automatically shown if no access
};

// Render modals
return (
  <>
    {/* Component content */}
    <AccessModals />
  </>
);
```

### 4. Admin Manual Upgrade (Admin Only)

**Component**: `PremiumUpgradeButton`
**Location**: `/src/components/admin/PremiumUpgradeButton.tsx`
**Page**: `/admin/users`

Allows administrators to manually upgrade users without payment.

**Features**:
- Dropdown menu with plan selection
- Monthly ($3.99) and Yearly ($39.99) options
- Instant upgrade without Stripe checkout
- Success/error notifications
- Only visible to admin users

## Technical Implementation

### Stripe Integration

**Checkout Session Creation**
- **Endpoint**: `/src/app/api/create-checkout-session/route.ts`
- **Method**: POST
- **Parameters**: 
  - `priceId`: Stripe price ID (monthly/yearly)
  - `userId`: Firebase user ID
  - `userEmail`: User email

**Flow**:
1. Creates/retrieves Stripe customer
2. Updates customer metadata with Firebase UID
3. Creates checkout session
4. Returns session URL for redirect

**Success/Cancel URLs**:
- Success: `/account?success=true`
- Cancel: `/account?canceled=true`

### Subscription Hook

**Hook**: `useSubscription2`
**Location**: `/src/hooks/useSubscription2.ts`

Manages all subscription-related operations:
- `createCheckoutSession(priceId)`: Initiates payment flow
- `cancelSubscription()`: Cancels active subscription
- `subscription`: Current subscription data
- `isPremium`: Boolean premium status
- `userType`: 'guest' | 'free' | 'premium'

### Webhook Processing

**Endpoint**: `/src/app/api/stripe-webhook/route.ts`

Handles Stripe webhook events:
- `checkout.session.completed`: New subscription
- `customer.subscription.updated`: Plan changes
- `customer.subscription.deleted`: Cancellations
- Updates Firestore subscription data

### Billing Portal

**Endpoint**: `/src/app/api/create-portal-session/route.ts`

Premium users can manage their subscription:
- Update payment methods
- Change plans
- Cancel subscription
- View billing history

## Analytics Tracking

The system tracks key conversion events:

1. **Modal Events**:
   - `upgrade_modal_shown`: When upgrade modal appears
   - `upgrade_plan_selected`: When user clicks upgrade button
   - `upgrade_modal_dismissed`: When user dismisses modal

2. **Limit Events**:
   - `feature_limit_reached`: When daily limit hit
   - Includes feature name and usage stats

## Pricing Structure

### Monthly Plan - $3.99/month
- Full access to all features
- Unlimited daily usage
- Cloud sync across devices
- Priority support

### Yearly Plan - $39.99/year
- All monthly plan features
- Save 17% (2 months free)
- Best value option
- Same-day cancellation policy

## Free Plan Limitations

Users on the free plan have:
- Limited to 3 word lists
- Maximum 3 drills per day
- No cloud sync (local storage only)
- Basic features only
- Daily usage limits on all tracked features

## Best Practices

1. **Conversion Optimization**:
   - Show upgrade modal at natural friction points
   - Highlight value proposition clearly
   - Make pricing transparent
   - Offer "Maybe Later" to reduce friction

2. **User Experience**:
   - Smooth animations for modals
   - Clear benefit explanations
   - Easy plan comparison
   - One-click upgrade process

3. **Technical Considerations**:
   - Always verify subscription status server-side
   - Handle Stripe webhook retries
   - Implement proper error handling
   - Track analytics for optimization