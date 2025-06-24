# Netlify Deployment Guide for Watanoc Article Scraping

## Required Environment Variables for Netlify Functions

To enable the Watanoc article scraping functionality, you need to configure the following environment variables in your Netlify deployment settings:

### Firebase Admin SDK Configuration

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

## Getting Firebase Service Account Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings > Service Accounts
4. Click "Generate new private key"
5. Download the JSON file
6. Extract the required values from the JSON and add them to Netlify environment variables

## Netlify Function Configuration

The scraping function is configured to:
- Run daily at 6 AM UTC (3 PM JST) automatically
- Can be triggered manually via POST request to `/.netlify/functions/scrape-watanoc-articles`
- Stores articles in Firebase Firestore `articles` collection
- Updates article statistics in `articlesMetadata/stats` document

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
2. Check Netlify function logs for any errors
3. Manually trigger scraping: `POST /.netlify/functions/scrape-watanoc-articles`
4. Verify articles appear in Firebase Firestore
5. Check the `/news` page loads articles correctly

## Troubleshooting

### Common Issues:

1. **"Firebase environment variables not configured"**
   - Ensure all 5 Firebase environment variables are set in Netlify

2. **"Firebase not initialized"**
   - Check the private key format (newlines must be properly handled)
   - Verify the service account has Firestore read/write permissions

3. **"Permission denied" errors**
   - Deploy the updated `firestore.rules` to Firebase
   - Ensure the service account has proper IAM roles

4. **Index errors**
   - Deploy the Firestore indexes: `firebase deploy --only firestore:indexes`

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