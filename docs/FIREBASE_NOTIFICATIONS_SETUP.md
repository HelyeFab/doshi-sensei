# Firebase Cloud Messaging (FCM) Setup Guide

## Getting Your VAPID Key

The VAPID key (Voluntary Application Server Identification) is required for web push notifications. Here's how to get it from Firebase:

### Steps to Get VAPID Key:

1. **Go to Firebase Console**
   - Navigate to https://console.firebase.google.com
   - Select your project: `doshi-sensei`

2. **Access Project Settings**
   - Click the gear icon next to "Project Overview"
   - Select "Project settings"

3. **Navigate to Cloud Messaging**
   - Click on the "Cloud Messaging" tab

4. **Find Web Push Certificates**
   - Scroll down to "Web configuration" section
   - Look for "Web Push certificates"

5. **Get or Generate VAPID Key**
   - If you see a key pair listed, click on the key to copy it
   - If no key exists, click "Generate key pair"
   - Copy the generated key (it starts with "B" and is a long string)

### Add VAPID Key to Your Environment

1. Open your `.env` file
2. Add the following line:
```
NEXT_PUBLIC_FCM_VAPID_KEY=your_vapid_key_here
```

3. Replace `your_vapid_key_here` with the key you copied from Firebase

### Example
```
NEXT_PUBLIC_FCM_VAPID_KEY=BDhl_OaRcbZ2pxcXeWxX_JrA7OVz4YduiOQWuw8uSJAfUaSU_ZR8UX7soK5wreNZZHJ9A2Sbo90DetC8-2ysIA
```

## Important Notes

- The VAPID key must start with "B"
- It's safe to expose this key in client-side code (that's why it uses NEXT_PUBLIC_ prefix)
- Each Firebase project has its own unique VAPID key
- If you regenerate the key, all existing push subscriptions will become invalid

## Troubleshooting

If you get errors about invalid VAPID key:
1. Make sure you're using the key from the correct Firebase project
2. Ensure there are no extra spaces or line breaks in the key
3. Restart your Next.js development server after adding the key to .env
4. Clear your browser cache and service workers

## Testing

After adding the VAPID key:
1. Restart your development server: `npm run dev`
2. Navigate to `/test-vocab-notifications`
3. Click "Enable Notifications First"
4. Accept the browser permission prompt
5. Check that FCM Token is displayed (not "No token")