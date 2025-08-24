# Complete Stripe Test Flow Guide

## Test Credentials for New User

### 1. Create New Test User
- Email: `stripetest@example.com`
- Password: `TestUser123!`
- Name: `Stripe Test User`

### 2. Test Credit Cards (Stripe Test Mode)

#### Successful Payment Cards:
- **Visa**: `4242 4242 4242 4242`
- **Mastercard**: `5555 5555 5555 4444`
- **Any CVC**: Use any 3 digits (e.g., `123`)
- **Any Future Expiry**: Use any future date (e.g., `12/25`)
- **Any ZIP**: Use any 5 digits (e.g., `12345`)

#### Cards for Testing Failures:
- **Declined**: `4000 0000 0000 0002`
- **Insufficient Funds**: `4000 0000 0000 9995`
- **Expired Card**: `4000 0000 0000 0069`

## Step-by-Step Test Flow

### Phase 1: Account Creation
1. Go to http://localhost:3000
2. Click "Sign Up" or go to `/signup`
3. Enter the test user credentials above
4. Verify email if required

### Phase 2: Test Monthly Subscription
1. Go to Account page: http://localhost:3000/account
2. You should see "Free Plan" status
3. Click on the Monthly plan (£8.99/month)
4. In Stripe Checkout:
   - Use test card: `4242 4242 4242 4242`
   - Expiry: `12/25`
   - CVC: `123`
   - Name: `Stripe Test User`
   - Email will be pre-filled
5. Complete the purchase
6. You'll be redirected back with success
7. Verify account shows "Monthly Premium"

### Phase 3: Test Upgrade to Yearly
1. On Account page, you should now see option to upgrade to Yearly
2. Click "Upgrade to Yearly" (£89.99/year)
3. This should take you to Stripe Customer Portal
4. Complete the upgrade
5. Verify account shows "Yearly Premium"

### Phase 4: Test Manage Billing
1. Click "Manage Billing" button
2. Should open Stripe Customer Portal
3. You can:
   - View payment methods
   - Download invoices
   - Update billing details
   - See subscription details

### Phase 5: Test Cancellation
1. Click "Cancel Subscription" button
2. Confirm cancellation
3. Verify subscription shows "Canceling at period end"
4. Check that features still work until period end

### Phase 6: Verify Features
- [ ] Payment History displays correctly
- [ ] Invoice download works
- [ ] User limits updated (Premium features unlocked)
- [ ] Subscription status shows correctly

## What to Check in Stripe Dashboard

1. Go to https://dashboard.stripe.com/
2. Ensure "Test mode" is ON (toggle in top-left)
3. Check:
   - **Payments**: See test transactions
   - **Customers**: See test customer created
   - **Subscriptions**: See active/canceled subscriptions
   - **Webhooks**: Check webhook events are being sent

## Troubleshooting

### If payment fails:
- Check browser console for errors
- Verify you're using test cards
- Ensure test mode is active

### If subscription doesn't update:
- Check webhook is receiving events (Stripe Dashboard > Webhooks)
- Check Cloud Functions logs: `firebase functions:log`
- Verify Firestore is being updated

### If cancellation doesn't work:
- Check the subscription ID exists in Stripe test mode
- Verify the cancel endpoint is using test keys
- Check browser console for specific errors

## Important URLs

- Local App: http://localhost:3000
- Account Page: http://localhost:3000/account
- Stripe Test Dashboard: https://dashboard.stripe.com/test
- Firebase Console: https://console.firebase.google.com/
- Cloud Functions Logs: `firebase functions:log --only stripeWebhook`