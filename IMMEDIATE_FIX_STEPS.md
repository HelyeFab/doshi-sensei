# IMMEDIATE FIX - Manual Steps for wealthypins@gmail.com

## Step 1: Find the User ID
1. Go to [Firebase Console - Authentication](https://console.firebase.google.com/project/doshi-sensei/authentication/users)
2. Search for: `wealthypins@gmail.com`
3. Copy the User UID (it will look like: `AbCdEfGhIjKlMnOpQrStUvWxYz`)

## Step 2: Update Firestore
1. Go to [Firebase Console - Firestore](https://console.firebase.google.com/project/doshi-sensei/firestore/data/~2Fusers)
2. Find the document with the User UID you copied
3. Click on the document to edit it

## Step 3: Add/Update These Fields
Click "Add field" or edit existing fields and set:

```json
{
  "subscription": {
    "userId": "[THE_USER_UID]",
    "status": "active",
    "plan": "monthly",
    "stripeCustomerId": "cus_[CHECK_STRIPE_DASHBOARD]",
    "stripeSubscriptionId": "sub_[CHECK_STRIPE_DASHBOARD]",
    "currentPeriodEnd": "2025-08-29T00:00:00.000Z",
    "cancelAtPeriodEnd": false,
    "metadata": {
      "source": "stripe",
      "createdAt": "2025-07-29T00:00:00.000Z",
      "updatedAt": "2025-07-29T00:00:00.000Z",
      "manuallyFixed": true
    }
  },
  "limits": {
    "maxLists": -1,
    "maxDrillsPerDay": -1,
    "maxKanjiQuestPerDay": -1,
    "maxStoriesPerDay": -1,
    "maxArticlesPerDay": -1,
    "maxKanaDropPerDay": -1,
    "canSync": true,
    "canSave": true
  }
}
```

## Step 4: Get Stripe IDs
1. Go to [Stripe Dashboard - Customers](https://dashboard.stripe.com/customers)
2. Search for `wealthypins@gmail.com`
3. Click on the customer
4. Copy the Customer ID (starts with `cus_`)
5. Look for the active subscription and copy the Subscription ID (starts with `sub_`)
6. Update the fields above with these IDs

## Step 5: Test
1. Log out and log back in to doshisensei.com
2. Go to Account page - should show Premium status
3. Test a premium feature

## Long-term Fixes Already Applied
- ✅ Added `NEXT_PUBLIC_APP_URL` to code
- ✅ Updated Stripe redirect URLs to use custom domain
- ✅ Created documentation for the issue

## Still Need to Do
1. Add `NEXT_PUBLIC_APP_URL=https://doshisensei.com` to Netlify environment variables
2. Add `doshisensei.netlify.app` to Firebase authorized domains
3. Deploy the code changes