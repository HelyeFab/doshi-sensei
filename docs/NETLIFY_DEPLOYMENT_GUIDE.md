# Netlify Deployment Guide for Article Scraping Functions

## Overview

This guide covers the deployment and configuration of the article scraping functions for Doshi Sensei on Netlify. The app includes multiple scraping functions (Watanoc, Todaii, NHK Easy) that fetch Japanese learning content.

## Required Environment Variables for Netlify Functions

The scraping functions use a unified Firebase initialization system that supports multiple configuration methods. You need to configure ONE of the following approaches in your Netlify deployment settings:

### Option 1: Individual Firebase Environment Variables (Recommended)

1. **FIREBASE_PROJECT_ID**
   - Your Firebase project ID
   - Example: `doshi-sensei-12345`

2. **FIREBASE_PRIVATE_KEY_ID**
   - The private_key_id from your Firebase service account JSON
   - Example: `abc123def456...`

3. **FIREBASE_PRIVATE_KEY**
   - The private_key from your Firebase service account JSON
   - **Important**: Replace `\n` with actual newlines, or use the raw key with `\n` characters
   - Example: `-----BEGIN PRIVATE KEY-----\nMIIEvgIBA...`

4. **FIREBASE_CLIENT_EMAIL**
   - The client_email from your Firebase service account JSON
   - Example: `firebase-adminsdk-xyz@doshi-sensei-12345.iam.gserviceaccount.com`

5. **FIREBASE_CLIENT_ID**
   - The client_id from your Firebase service account JSON
   - Example: `123456789012345678901`

### Option 2: Single JSON Service Account (Alternative)

Instead of individual variables, you can provide the entire service account JSON:

1. **FIREBASE_SERVICE_ACCOUNT** or **FIREBASE_SERVICE_ACCOUNT_KEY**
   - The complete service account JSON as a string
   - Example: `{"type":"service_account","project_id":"doshi-sensei","private_key":"-----BEGIN PRIVATE KEY-----\n...","client_email":"..."}`

### Option 3: Using NEXT_PUBLIC_ Variables (Fallback)

If you already have these variables set for the main app, the scraping functions will automatically fall back to:
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_PRIVATE_KEY_ID
- NEXT_PUBLIC_FIREBASE_PRIVATE_KEY
- NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL
- NEXT_PUBLIC_FIREBASE_CLIENT_ID

## Getting Firebase Service Account Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings > Service Accounts
4. Click "Generate new private key"
5. Download the JSON file
6. Extract the required values from the JSON and add them to Netlify environment variables

## Available Scraping Functions

The following scraping functions are available:

1. **scrape-watanoc-real** - Scrapes realistic Japanese learning content
   - Endpoint: `/.netlify/functions/scrape-watanoc-real`
   - Method: GET or POST
   
2. **scrape-todaii-news** - Scrapes Todaii Japanese news
   - Endpoint: `/.netlify/functions/scrape-todaii-news`
   - Method: GET or POST
   
3. **scrape-nhk-easy** - Scrapes NHK Easy News
   - Endpoint: `/.netlify/functions/scrape-nhk-easy`
   - Method: GET or POST
   
4. **scrape-multi-source** - Scrapes from multiple sources
   - Endpoint: `/.netlify/functions/scrape-multi-source`
   - Method: GET or POST

5. **test-scraper-init** - Tests Firebase initialization
   - Endpoint: `/.netlify/functions/test-scraper-init`
   - Method: GET
   - Use this to verify your Firebase configuration is working

## Netlify Function Configuration

The scraping functions are configured to:
- Can be triggered manually via GET/POST requests
- Store articles in Firebase Firestore `articles` collection
- Update article statistics in `articlesMetadata` collection
- Include proper CORS headers for browser access

## Firestore Security Rules

The `firestore.rules` file has been updated to allow:
- Public read access to articles (no authentication required)
- Admin-only write access to articles
- Public read access to article metadata/stats

## Firestore Indexes

The `firestore.indexes.json` file includes indexes for:
- `scrapedAt` field for article ordering
- `difficulty` + `scrapedAt` for JLPT level filtering
- `category` + `scrapedAt` for category filtering

## Testing the Deployment

1. Deploy to Netlify with environment variables configured
2. Test Firebase initialization:
   ```bash
   curl https://your-site.netlify.app/.netlify/functions/test-scraper-init
   ```
3. Check the response for initialization status and any missing variables
4. Manually trigger scraping functions:
   ```bash
   curl https://your-site.netlify.app/.netlify/functions/scrape-watanoc-real
   curl https://your-site.netlify.app/.netlify/functions/scrape-todaii-news
   curl https://your-site.netlify.app/.netlify/functions/scrape-nhk-easy
   ```
5. Verify articles appear in Firebase Firestore
6. Check the articles page loads content correctly

## Troubleshooting

### Common Issues:

1. **"Firebase Admin accessed before initialization - operations may fail"**
   - This warning appears during build but is normal
   - The unified initialization handles this at runtime

2. **"Firebase environment variables not configured"**
   - Run the test-scraper-init function to see which variables are missing
   - Ensure you've configured at least ONE of the three options (individual vars, JSON, or NEXT_PUBLIC_)

3. **"Firebase not initialized" or "The default Firebase app does not exist"**
   - Check the private key format (newlines must be properly handled)
   - In Netlify UI, use the multi-line input for FIREBASE_PRIVATE_KEY
   - Verify the service account has Firestore read/write permissions

4. **"Permission denied" errors**
   - Deploy the updated `firestore.rules` to Firebase
   - Ensure the service account has proper IAM roles
   - Check that the service account email matches your Firebase project

5. **Index errors**
   - Deploy the Firestore indexes: `firebase deploy --only firestore:indexes`

6. **CORS errors in browser console**
   - The functions include CORS headers, but check browser network tab
   - Ensure you're calling the correct function URLs

### Monitoring:

- Check Netlify function logs for scraping activity
- Monitor Firebase Firestore for new articles
- Use the `/news` page to verify articles are displaying correctly

## Production Considerations

1. **Rate Limiting**: The scraper includes 1-second delays between requests to be respectful to Watanoc
2. **Error Handling**: Falls back to high-quality mock articles if scraping fails
3. **Content Validation**: Validates article content length and structure
4. **Automatic JLPT Level Detection**: Uses character complexity analysis
5. **Caching**: Frontend caches articles for 5 minutes to reduce Firebase reads

The system is designed to be robust and continue working even if Watanoc's structure changes, using fallback content to ensure users always have articles to read.