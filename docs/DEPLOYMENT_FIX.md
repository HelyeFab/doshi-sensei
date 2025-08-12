# Fix WaniKani API in Production

## Steps to Fix:

1. **Go to Netlify Dashboard**
   - Navigate to your site settings
   - Go to "Environment variables" section

2. **Add the Following Environment Variable:**
   ```
   NEXT_PUBLIC_WANIKANI_API_TOKEN=db0708c2-d1d4-4865-948c-b31c9ebdc04e
   ```

3. **Trigger a Rebuild**
   - Go to "Deploys" tab
   - Click "Trigger deploy" → "Clear cache and deploy site"

## Why This Happens:

- **Development**: The token is available from your local `.env` file
- **Production**: Netlify doesn't have access to your local `.env` file
- **Build Time**: `NEXT_PUBLIC_*` variables are embedded during build, not at runtime

## Alternative: Hardcode the Token (Already Done)

We've already added a fallback in the code, but it seems the service worker or some caching mechanism is interfering. The environment variable approach is cleaner.

## Verify the Fix:

After deployment, visit:
```
https://doshisensei.com/api/debug-env?key=debug-2025-wanikani
```

You should see:
```json
{
  "hasWanikaniToken": true,
  "wanikaniTokenPrefix": "db0708c2"
}
```