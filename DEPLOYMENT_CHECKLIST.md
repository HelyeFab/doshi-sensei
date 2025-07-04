# Deployment Checklist - Fix Article Scraping

## Current Issues
1. Firebase initialization failing in Netlify functions
2. Scraping functions returning 500 errors
3. Local development trying to call production functions

## What We Fixed
1. ✅ Created unified Firebase initialization (`netlify/functions/utils/firebase-init.js`)
2. ✅ Updated all scraping functions to use unified initialization
3. ✅ Fixed newsScraper.ts to always use production URL (https://doshisensei.com)
4. ✅ Added better error handling and fallback to mock data

## Deployment Steps

### 1. Verify Environment Variables in Netlify
```bash
# Test which variables are set
curl https://doshisensei.com/.netlify/functions/test-firebase

# Or use the new test function after deployment
curl https://doshisensei.com/.netlify/functions/test-scraper-init
```

### 2. Deploy the Changes
```bash
# Commit all changes
git add .
git commit -m "Fix Firebase initialization in Netlify functions"
git push
```

### 3. Wait for Netlify Deploy
- Check Netlify dashboard for deployment status
- View function logs if there are errors

### 4. Test the Functions
After deployment completes:

```bash
# Test Firebase initialization
curl https://doshisensei.com/.netlify/functions/test-scraper-init

# Test individual scrapers
curl https://doshisensei.com/.netlify/functions/scrape-watanoc-real
curl https://doshisensei.com/.netlify/functions/scrape-todaii-news
curl https://doshisensei.com/.netlify/functions/scrape-nhk-easy
```

### 5. Verify in Browser
1. Go to https://doshisensei.com/admin/articles
2. Click "Refresh Articles" button
3. Check browser console for any errors

## If Still Having Issues

### Check Netlify Function Logs
1. Go to Netlify Dashboard
2. Functions → View logs
3. Look for initialization errors

### Verify Environment Variables
The functions need ONE of these setups:

**Option A: Individual Variables**
- FIREBASE_PROJECT_ID
- FIREBASE_PRIVATE_KEY_ID
- FIREBASE_PRIVATE_KEY
- FIREBASE_CLIENT_EMAIL
- FIREBASE_CLIENT_ID

**Option B: JSON Variable**
- FIREBASE_SERVICE_ACCOUNT (complete JSON)

### Common Issues
1. **Private key format**: Make sure FIREBASE_PRIVATE_KEY has proper line breaks
2. **Missing variables**: Run test-scraper-init to see what's missing
3. **CORS errors**: The functions include CORS headers, shouldn't be an issue

## Local Development
When running locally (`npm run dev`):
- The app will try to fetch from production Netlify functions
- This is expected behavior
- If functions fail, it will use mock data

## Success Indicators
- No Firebase initialization errors in console
- Articles load in the admin dashboard
- Scraping functions return `{success: true, articles: [...]}`