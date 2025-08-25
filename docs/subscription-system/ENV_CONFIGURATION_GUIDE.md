# Environment Configuration Guide

## Overview
This guide documents how Stripe price IDs and other critical configuration are managed using environment variables as the single source of truth.

## Architecture

### Main Application (.env)
The main Next.js application uses environment variables prefixed with `NEXT_PUBLIC_` for client-side access:
- `NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID` - Monthly subscription price ID
- `NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID` - Yearly subscription price ID

### Cloud Functions (/functions/.env)
Cloud Functions use their own `.env` file with unprefixed variables:
- `STRIPE_MONTHLY_PRICE_ID` - Monthly subscription price ID (same value as main app)
- `STRIPE_YEARLY_PRICE_ID` - Yearly subscription price ID (same value as main app)
- `STRIPE_SECRET_KEY` - Stripe secret key for server-side operations
- `STRIPE_WEBHOOK_SECRET` - Webhook endpoint secret for signature verification

## Important Rules

### 1. NO Hardcoded Price IDs
- All price IDs MUST come from environment variables
- Never hardcode price IDs in source code
- Configuration files read from environment variables

### 2. Synchronization Required
Price IDs must match between environments:
```
Main App:        NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID = price_xxx
Functions:       STRIPE_MONTHLY_PRICE_ID = price_xxx (same value)
```

### 3. Validation Before Deployment
Run the validation script before deploying:
```bash
npm run validate:env
```

This script will:
- Check that all required variables are set
- Verify price IDs match between environments
- Ensure Stripe keys are properly formatted
- Warn about any configuration issues

## Setting Up Environment Variables

### Local Development

1. **Main Application** - Create `.env.local`:
```env
# Stripe Configuration
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_1RzIUUQkBRi5wGMEzm9veY3j
NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID=price_1RzIVDQkBRi5wGME6v7ECis8
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

2. **Cloud Functions** - Create `/functions/.env.test`:
```env
# Test Stripe Configuration
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_MONTHLY_PRICE_ID=price_1RzIUUQkBRi5wGMEzm9veY3j
STRIPE_YEARLY_PRICE_ID=price_1RzIVDQkBRi5wGME6v7ECis8
```

### Production Deployment

1. **Vercel/Netlify** - Set environment variables in dashboard:
   - All `NEXT_PUBLIC_*` variables
   - Server-side secrets

2. **Cloud Functions** - Deploy configuration:
```bash
# Deploy functions with production .env
cd functions
firebase deploy --only functions
```

## Price ID Reference

### Production (Live Mode)
- Monthly: `price_1RubMXHdrJomitOwNNI4LmWB` (£8.99/month)
- Yearly: `price_1RubMxHdrJomitOwElEo6nys` (£89.99/year)

### Test Mode
- Monthly: `price_1RzIUUQkBRi5wGMEzm9veY3j` (£8.99/month)
- Yearly: `price_1RzIVDQkBRi5wGME6v7ECis8` (£89.99/year)

## Validation Script

The validation script (`scripts/validate-env-sync.js`) ensures configuration consistency:

### Running Validation
```bash
# Manual validation
npm run validate:env

# Automatic validation (runs before build)
npm run build
```

### What It Checks
1. ✅ Price IDs are synchronized between environments
2. ✅ All required Stripe variables are present
3. ✅ Webhook secrets are properly formatted
4. ✅ Live/Test mode consistency

### Exit Codes
- `0` - All validations passed (or passed with warnings)
- `1` - Critical validation failures found

## Troubleshooting

### Price ID Mismatch Error
**Problem**: Validation fails with "Price ID mismatch"
**Solution**: 
1. Check both `.env` and `/functions/.env`
2. Ensure values are identical (except for prefix)
3. Run `npm run validate:env` to verify

### Missing Environment Variable
**Problem**: Application fails with "Price IDs not configured"
**Solution**:
1. Check that `.env` file exists
2. Verify variable names are correct
3. Restart development server after adding variables

### Webhook Signature Verification Failed
**Problem**: Stripe webhooks fail with signature error
**Solution**:
1. Verify `STRIPE_WEBHOOK_SECRET` in `/functions/.env`
2. Ensure you're using the correct webhook secret for the environment
3. Check that the webhook URL in Stripe Dashboard matches your deployment

## Migration Checklist

When updating price IDs:
- [ ] Update `NEXT_PUBLIC_STRIPE_*_PRICE_ID` in main `.env`
- [ ] Update `STRIPE_*_PRICE_ID` in `/functions/.env`
- [ ] Run `npm run validate:env` to verify sync
- [ ] Test with a test purchase
- [ ] Deploy functions: `firebase deploy --only functions`
- [ ] Deploy main app to production
- [ ] Verify webhooks are processing correctly

## Security Notes

1. **Never commit `.env` files** - They contain secrets
2. **Use different keys for test/production** - Never mix environments
3. **Rotate webhook secrets regularly** - Update in Stripe Dashboard and `.env`
4. **Monitor webhook health** - Check `/api/webhook-health` endpoint regularly

## Related Documentation

- [Webhook Monitoring](./webhook-monitoring.md)
- [Subscription Architecture](./subscription-architecture.md)
- [Hook Migration Guide](./HOOK_MIGRATION_GUIDE.md)