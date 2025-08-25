# Refund Handling - Quick Reference

## 🚨 Emergency Response

If refund processing fails and a user retains premium access after a refund:

1. **Check Critical Alerts**:
   ```bash
   # Firebase Console → Firestore → critical_alerts collection
   # Look for unresolved alerts with type: refund_user_not_found or refund_processing_error
   ```

2. **Manual User Downgrade**:
   ```javascript
   // In Firebase Console or admin script
   await db.collection('users').doc('USER_ID').update({
     'subscription.plan': 'free',
     'subscription.status': 'canceled',
     'subscription.cancelReason': 'manual_refund_fix'
   });
   ```

3. **Cancel Stripe Subscription**:
   ```bash
   stripe subscriptions cancel sub_SUBSCRIPTION_ID
   ```

## 📊 Monitoring Dashboard

### Key Collections to Watch

| Collection | Purpose | Alert Threshold |
|------------|---------|-----------------|
| `critical_alerts` | Refund failures | Any unresolved |
| `refund_audit_logs` | All refund events | Success rate < 95% |
| `webhook_logs` | Webhook processing | Error rate > 5% |

### Critical Alert Types

- **`refund_user_not_found`**: Refund processed but no user found → Manual access revocation needed
- **`refund_processing_error`**: Technical failure → Check logs and retry if needed

## 🔍 Debugging Checklist

When a refund issue occurs:

### 1. Verify Webhook Receipt
```bash
# Check webhook_logs collection
db.collection('webhook_logs')
  .where('type', '==', 'charge.refunded')
  .where('eventId', '==', 'evt_STRIPE_EVENT_ID')
```

### 2. Check User Lookup
```bash
# Verify customer has Firebase UID
stripe customers retrieve cus_CUSTOMER_ID

# Check user exists in Firestore
db.collection('users').doc('FIREBASE_UID').get()
```

### 3. Validate Subscription State
```bash
# Current user subscription status
db.collection('users').doc('FIREBASE_UID').get()
  .then(doc => console.log(doc.data().subscription))
```

### 4. Review Audit Trail
```bash
# Check refund audit logs
db.collection('refund_audit_logs')
  .where('details.chargeId', '==', 'ch_CHARGE_ID')
  .orderBy('timestamp', 'desc')
```

## 🛠 Common Fixes

### User Not Found Errors
```javascript
// Update Stripe customer with Firebase UID
await stripe.customers.update('cus_CUSTOMER_ID', {
  metadata: { firebaseUID: 'USER_FIREBASE_UID' }
});

// Then reprocess refund manually
await handleChargeRefunded(chargeObject);
```

### Duplicate Refund Processing
```javascript
// Check webhook_events for idempotency key
db.collection('webhook_events').doc('evt_STRIPE_EVENT_ID').get()

// If duplicate, ignore - system handles this automatically
```

### Partial Refund Questions
```
Business Policy: ALL refunds (partial or full) trigger immediate cancellation
No exceptions - this is intentional business logic
```

## 📈 Performance Metrics

Track these KPIs:
- **Refund Processing Success Rate**: Target 99%+
- **User Lookup Success Rate**: Target 95%+  
- **Average Processing Time**: Target <5 seconds
- **Critical Alerts**: Target 0 unresolved

## 🔒 Security Checks

### Before Processing Any Refund:
- ✅ Webhook signature verified
- ✅ Event idempotency checked  
- ✅ Refund amount validated
- ✅ Customer exists and active
- ✅ User lookup through multiple strategies

### After Processing:
- ✅ User subscription downgraded
- ✅ Stripe subscription canceled
- ✅ Audit trail complete
- ✅ Critical alerts cleared

## 📞 Escalation Path

1. **Level 1**: Check critical_alerts collection
2. **Level 2**: Review refund_audit_logs for patterns
3. **Level 3**: Manual user access verification
4. **Level 4**: Stripe customer/subscription investigation
5. **Level 5**: Engineering team for webhook/code issues

## 🧪 Testing Commands

```bash
# Test webhook endpoint
curl -X GET https://your-function-url/stripeWebhook

# Run refund logic tests
node scripts/test-refund-logic.js

# Validate user access after refund
node scripts/validate-user-access.js USER_ID
```

---
**🚨 REMEMBER**: When in doubt, revoke access. Better to false-positive than let refunded users keep premium access.