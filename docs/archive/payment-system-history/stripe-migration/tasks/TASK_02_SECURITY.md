# Task 2: Security & Configuration Management
## Assigned to: DevOps/Security Sub-Agent

### Objective
Migrate all Stripe secrets to Google Secret Manager and establish secure configuration management system.

### Prerequisites
- Task 1 (Audit) must be complete
- Google Cloud project access with Secret Manager API enabled
- Firebase project configuration

### Deliverables
1. All secrets migrated to Google Secret Manager
2. Cloud Functions updated to use Secret Manager
3. Centralized configuration system implemented
4. Security audit report

### Detailed Tasks

#### 2.1 Setup Google Secret Manager
**Steps**:
1. Enable Secret Manager API in Google Cloud Console
2. Create secrets for:
   - `stripe-secret-key`
   - `stripe-webhook-secret`
   - `stripe-webhook-endpoint-secret`

**Commands to execute**:
```bash
# Create secrets
gcloud secrets create stripe-secret-key --data-file=-
gcloud secrets create stripe-webhook-secret --data-file=-

# Grant Cloud Functions access
gcloud secrets add-iam-policy-binding stripe-secret-key \
  --member="serviceAccount:PROJECT-ID@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

#### 2.2 Update Cloud Functions to Use Secret Manager
**File to modify**: `/functions/src/index.ts`

**Current Code** (lines 81-86):
```typescript
const secretKey = process.env.STRIPE_SECRET_KEY;
```

**Replace with**:
```typescript
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const secretManager = new SecretManagerServiceClient();

async function getSecret(secretName: string): Promise<string> {
  const projectId = process.env.GCLOUD_PROJECT;
  const [version] = await secretManager.accessSecretVersion({
    name: `projects/${projectId}/secrets/${secretName}/versions/latest`,
  });
  return version.payload?.data?.toString() || '';
}

// In the function
const secretKey = await getSecret('stripe-secret-key');
const webhookSecret = await getSecret('stripe-webhook-secret');
```

**Update package.json**:
```json
{
  "dependencies": {
    "@google-cloud/secret-manager": "^5.0.1"
  }
}
```

#### 2.3 Create Centralized Configuration
**Create file**: `/functions/src/config/stripe.config.ts`

```typescript
export interface StripeConfig {
  prices: {
    monthly: {
      id: string;
      amount: number;
      currency: string;
    };
    yearly: {
      id: string;
      amount: number;
      currency: string;
    };
  };
  webhookEndpoints: {
    production: string;
    staging: string;
  };
  features: {
    enableGooglePay: boolean;
    enableApplePay: boolean;
    enableSubscriptionUpgrades: boolean;
  };
}

// Environment-specific configurations
const configs: Record<string, StripeConfig> = {
  production: {
    prices: {
      monthly: {
        id: 'price_1RubMXHdrJomitOwNNI4LmWB',
        amount: 899, // £8.99 in pence
        currency: 'gbp'
      },
      yearly: {
        id: 'price_1RubMxHdrJomitOwElEo6nys',
        amount: 8999, // £89.99 in pence
        currency: 'gbp'
      }
    },
    webhookEndpoints: {
      production: 'https://us-central1-PROJECT-ID.cloudfunctions.net/stripeWebhook',
      staging: 'https://us-central1-PROJECT-ID-staging.cloudfunctions.net/stripeWebhook'
    },
    features: {
      enableGooglePay: true,
      enableApplePay: true,
      enableSubscriptionUpgrades: false
    }
  },
  development: {
    // Development config...
  }
};

export function getConfig(): StripeConfig {
  const env = process.env.NODE_ENV || 'development';
  return configs[env] || configs.development;
}
```

#### 2.4 Remove Hardcoded Secrets
**Files to clean**:
- Remove all STRIPE_* variables from `.env.local`
- Remove from `.env.production`
- Update `.env.example` with placeholders only
- Remove from any committed files

**Git commands**:
```bash
# Remove secrets from git history if accidentally committed
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.local" \
  --prune-empty --tag-name-filter cat -- --all
```

#### 2.5 Implement Secret Rotation Policy
**Create file**: `/docs/stripe-migration/security/SECRET_ROTATION.md`

```markdown
# Secret Rotation Policy

## Rotation Schedule
- Stripe API Keys: Every 90 days
- Webhook Secrets: Every 180 days
- Emergency rotation: Within 1 hour of suspected compromise

## Rotation Process
1. Generate new secret in Stripe Dashboard
2. Update in Google Secret Manager
3. Deploy new version of Cloud Functions
4. Monitor for errors (15 minutes)
5. Disable old secret in Stripe Dashboard

## Automation Script
[Create rotation script in /scripts/rotate-stripe-secrets.sh]
```

### Success Criteria
- [ ] All secrets removed from codebase
- [ ] Secrets accessible only via Secret Manager
- [ ] Cloud Functions successfully retrieve secrets
- [ ] Configuration centralized and environment-aware
- [ ] Secret rotation policy documented
- [ ] No hardcoded values in code

### Security Checklist
- [ ] Secrets never logged or exposed in errors
- [ ] Access logs enabled for secret access
- [ ] IAM permissions follow principle of least privilege
- [ ] Backup secrets stored securely
- [ ] Rotation reminders set up

### Timeline
- Start: After Task 1 completion
- Duration: 5 hours
- Deadline: End of Day 2

### Testing
```bash
# Test secret access
gcloud functions call stripeWebhook --data '{"test": true}'

# Verify no secrets in code
grep -r "price_1RubM" --exclude-dir=node_modules .
grep -r "sk_live" --exclude-dir=node_modules .
```

### Rollback Plan
1. Keep backup of current .env files (encrypted)
2. Document current working configuration
3. Test rollback procedure before going live
4. Have Stripe Dashboard access ready for quick secret regeneration