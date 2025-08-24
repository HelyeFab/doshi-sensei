# Task 3: Webhook Consolidation
## Assigned to: Backend Sub-Agent (Webhook Specialist)

### Objective
Consolidate all webhook handling into a single, robust Google Cloud Function with complete feature parity, safety mechanisms, and monitoring.

### Prerequisites
- Task 2 (Security) must be complete
- Access to both current implementations for comparison
- Stripe Dashboard access for webhook configuration

### Critical Requirements
- **Zero downtime** during migration
- **No lost events** during transition
- **Complete feature parity** with Next.js implementation
- **Idempotency** to prevent duplicate processing

### Detailed Implementation Tasks

#### 3.1 Enhance Cloud Function Webhook
**File to modify**: `/functions/src/index.ts`

**Features to port from Next.js implementation** (`/src/app/api/stripe-webhook/route.ts`):
1. Comprehensive subscription history logging (lines 471-544)
2. Invoice PDF generation (lines 362-415)
3. Deduplication logic (lines 488-528)
4. Enhanced error handling (lines 78-108)
5. User entitlement updates (lines 225-264)

**New enhanced webhook structure**:
```typescript
// /functions/src/stripe-webhook.ts
import { https } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { getSecret } from './config/secrets';
import { StripeEventProcessor } from './stripe/event-processor';
import { WebhookLogger } from './monitoring/webhook-logger';
import { IdempotencyManager } from './stripe/idempotency';

export const stripeWebhook = https.onRequest({
  cors: true,
  maxInstances: 10,
  timeoutSeconds: 60,
  memory: '512MB'
}, async (req, res) => {
  const logger = new WebhookLogger();
  const idempotency = new IdempotencyManager();
  
  try {
    // Step 1: Validate request
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // Step 2: Verify signature
    const stripe = new Stripe(await getSecret('stripe-secret-key'), {
      apiVersion: '2023-10-16',
    });
    
    const signature = req.headers['stripe-signature'];
    const webhookSecret = await getSecret('stripe-webhook-secret');
    
    const event = stripe.webhooks.constructEvent(
      req.rawBody,
      signature,
      webhookSecret
    );
    
    // Step 3: Check idempotency
    if (await idempotency.isDuplicate(event.id)) {
      logger.logDuplicate(event);
      return res.status(200).json({ received: true, duplicate: true });
    }
    
    // Step 4: Process event
    const processor = new StripeEventProcessor(stripe);
    await processor.process(event);
    
    // Step 5: Mark as processed
    await idempotency.markProcessed(event.id);
    
    // Step 6: Log success
    await logger.logSuccess(event);
    
    return res.status(200).json({ received: true });
    
  } catch (error) {
    await logger.logError(error, req);
    
    if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
      return res.status(400).json({ error: 'Invalid signature' });
    }
    
    // Retry-able error
    return res.status(503).json({ error: 'Processing failed, will retry' });
  }
});
```

#### 3.2 Implement Event Processor
**Create file**: `/functions/src/stripe/event-processor.ts`

```typescript
export class StripeEventProcessor {
  constructor(private stripe: Stripe) {}
  
  async process(event: Stripe.Event): Promise<void> {
    const handlers: Record<string, (data: any) => Promise<void>> = {
      'checkout.session.completed': this.handleCheckoutCompleted.bind(this),
      'customer.subscription.created': this.handleSubscriptionCreated.bind(this),
      'customer.subscription.updated': this.handleSubscriptionUpdated.bind(this),
      'customer.subscription.deleted': this.handleSubscriptionDeleted.bind(this),
      'invoice.payment_succeeded': this.handlePaymentSucceeded.bind(this),
      'invoice.payment_failed': this.handlePaymentFailed.bind(this),
    };
    
    const handler = handlers[event.type];
    if (handler) {
      await handler(event.data.object);
    } else {
      console.log(`Unhandled event type: ${event.type}`);
    }
  }
  
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    // Port logic from Next.js implementation
    // Include all the comprehensive update logic
  }
  
  // ... other handlers
}
```

#### 3.3 Implement Idempotency Manager
**Create file**: `/functions/src/stripe/idempotency.ts`

```typescript
import * as admin from 'firebase-admin';

export class IdempotencyManager {
  private db = admin.firestore();
  private collection = 'webhook_events';
  private ttl = 24 * 60 * 60 * 1000; // 24 hours
  
  async isDuplicate(eventId: string): Promise<boolean> {
    const doc = await this.db.collection(this.collection).doc(eventId).get();
    
    if (!doc.exists) {
      return false;
    }
    
    const data = doc.data();
    const processedAt = data?.processedAt?.toDate();
    
    // Check if event is within TTL
    if (processedAt && Date.now() - processedAt.getTime() < this.ttl) {
      return true;
    }
    
    return false;
  }
  
  async markProcessed(eventId: string, result?: any): Promise<void> {
    await this.db.collection(this.collection).doc(eventId).set({
      eventId,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      result: result || 'success',
      expiresAt: new Date(Date.now() + this.ttl)
    });
  }
}
```

#### 3.4 Implement Retry Mechanism
**Create file**: `/functions/src/stripe/retry-manager.ts`

```typescript
export class RetryManager {
  async withRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      backoffMs?: number;
      maxBackoffMs?: number;
    } = {}
  ): Promise<T> {
    const maxRetries = options.maxRetries || 3;
    const backoffMs = options.backoffMs || 1000;
    const maxBackoffMs = options.maxBackoffMs || 30000;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        const delay = Math.min(
          backoffMs * Math.pow(2, attempt),
          maxBackoffMs
        );
        
        console.log(`Retry attempt ${attempt + 1} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Max retries exceeded');
  }
}
```

#### 3.5 Migration Cutover Process

**Step 1: Deploy Enhanced Function**
```bash
cd functions
npm run build
firebase deploy --only functions:stripeWebhook
```

**Step 2: Test with Stripe CLI**
```bash
# Forward webhooks to local function
stripe listen --forward-to https://us-central1-PROJECT.cloudfunctions.net/stripeWebhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
```

**Step 3: Update Stripe Dashboard**
1. Go to Stripe Dashboard → Webhooks
2. Add new endpoint: `https://us-central1-PROJECT.cloudfunctions.net/stripeWebhook`
3. Select all required events
4. Save and test with "Send test webhook"

**Step 4: Disable Next.js Route**
```typescript
// /src/app/api/stripe-webhook/route.ts
export async function POST() {
  // Webhook processing has been moved to Cloud Functions
  return new Response('Webhook endpoint disabled - use Cloud Functions', {
    status: 410 // Gone
  });
}
```

**Step 5: Monitor Transition**
```typescript
// Create monitoring dashboard query
const monitoringQuery = `
  SELECT 
    timestamp,
    event_type,
    status,
    processing_time_ms
  FROM webhook_logs
  WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
  ORDER BY timestamp DESC
`;
```

### Testing Checklist
- [ ] All webhook event types handled
- [ ] Idempotency prevents duplicate processing
- [ ] Retry mechanism works for transient failures
- [ ] Logging captures all necessary information
- [ ] Error handling returns appropriate status codes
- [ ] Performance under load (< 500ms processing time)
- [ ] Graceful degradation when dependencies fail

### Success Criteria
- [ ] Zero webhook processing errors in 24 hours
- [ ] All events from Stripe CLI test pass
- [ ] Monitoring dashboard shows healthy metrics
- [ ] No duplicate subscription updates
- [ ] Complete feature parity confirmed

### Rollback Plan
1. Keep Next.js route available but disabled
2. Can re-enable with single code change
3. Stripe Dashboard can switch endpoints immediately
4. All changes logged for quick reversal

### Timeline
- Start: After Task 2 completion
- Duration: 2 days
- Testing: 4 hours
- Monitoring: 24 hours post-deployment