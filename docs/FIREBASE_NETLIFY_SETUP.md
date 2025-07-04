# Firebase Setup for Netlify Functions

## Quick Setup Guide

### 1. Set Environment Variables in Netlify

Go to your Netlify site settings → Environment variables and add ONE of these options:

#### Option A: Individual Variables (Recommended)
```
FIREBASE_PROJECT_ID=doshi-sensei
FIREBASE_PRIVATE_KEY_ID=your-key-id
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYour-Actual-Private-Key\n-----END PRIVATE KEY-----
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@doshi-sensei.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
```

#### Option B: Single JSON Variable
```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"doshi-sensei","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----","client_email":"...","client_id":"..."}
```

### 2. Deploy to Netlify

After setting the environment variables:

1. Push your changes to Git
2. Netlify will automatically deploy
3. Wait for the deployment to complete

### 3. Test the Functions

Once deployed, test with these URLs:

```bash
# Test Firebase initialization
curl https://your-site.netlify.app/.netlify/functions/test-scraper-init

# Test individual scrapers
curl https://your-site.netlify.app/.netlify/functions/scrape-watanoc-real
curl https://your-site.netlify.app/.netlify/functions/scrape-todaii-news
curl https://your-site.netlify.app/.netlify/functions/scrape-nhk-easy
```

## Local Testing

To test the functions locally:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Link your site
netlify link

# Set up environment variables locally
# Create a .env file in your project root with the Firebase variables

# Run functions locally
netlify dev

# Test locally at:
# http://localhost:8888/.netlify/functions/test-scraper-init
```

## Troubleshooting

### "Page not found" (404) Error

This means the functions haven't been deployed yet or the URL is incorrect.

1. Check your Netlify deploy logs
2. Ensure the functions are in the `netlify/functions/` directory
3. Make sure the function files export a `handler` function
4. Wait for the deployment to complete

### Firebase Initialization Errors

1. Check which variables are missing:
   - The test-scraper-init function will show you
2. Ensure the private key has proper line breaks:
   - In Netlify UI, paste the key with actual line breaks
   - Or use \n in the string

### Still Having Issues?

1. Check Netlify Function logs:
   - Go to Netlify Dashboard → Functions → View logs
2. Use the test function to debug:
   - It shows exactly what's configured and what's missing