# 🔒 Firestore Security Rules Deployment Guide

## Problem: "Missing or insufficient permissions"

Your app is getting permission errors because Firestore security rules aren't set up to allow users to access their own data.

---

## 🚀 Quick Fix: Deploy Security Rules

### **Method 1: Firebase Console (Easiest)**

1. **Go to [Firebase Console](https://console.firebase.google.com)**
2. **Select your project**
3. **Navigate to**: Firestore Database → Rules
4. **Replace the existing rules** with this content:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      // Allow read/write if the authenticated user ID matches the document ID
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Allow access to user's subcollections (wordLists, savedWords, etc.)
      match /{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

5. **Click "Publish"**
6. **Test sync again** - should work immediately! ✅

---

### **Method 2: Firebase CLI (Advanced)**

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project (if not done)
firebase init firestore

# Deploy the rules
firebase deploy --only firestore:rules
```

---

## 🔐 What These Rules Do

### **Security Model:**
- ✅ **Users can only access their own data** (`request.auth.uid == userId`)
- ✅ **Must be authenticated** (`request.auth != null`)
- ✅ **Access to all subcollections** (wordLists, savedWords, progress, etc.)
- ❌ **No access to other users' data**
- ❌ **No access for unauthenticated users**

### **Data Structure Protected:**
```
users/{uid}/
├── subscription/       ✅ User can read/write
├── wordLists/         ✅ User can read/write
├── savedWords/        ✅ User can read/write
├── progress/          ✅ User can read/write
└── settings/          ✅ User can read/write

users/{other-uid}/     ❌ No access to other users
```

---

## 🧪 Testing the Fix

### **After deploying rules:**

1. **Go to Settings page**
2. **Click "Sync Now"**
3. **Should see**: "Sync completed successfully!" ✅
4. **Check console**: No more permission errors

### **Expected Behavior:**
- ✅ Premium users can sync data
- ✅ Data appears in Firestore under `users/{uid}/`
- ✅ Cross-device sync works
- ✅ No permission errors

---

## 🚨 Troubleshooting

### **Still getting permission errors?**

1. **Wait 1-2 minutes** after deploying rules
2. **Clear browser cache** and refresh
3. **Check Firebase Console** → Authentication → Users (user should exist)
4. **Verify user is logged in** (check Account page)
5. **Ensure user has premium subscription** (cloud sync requires premium)

### **Check User Authentication:**
```javascript
// In browser console
console.log(firebase.auth().currentUser?.uid);
// Should show your user ID
```

### **Verify Rules Deployment:**
- Firebase Console → Firestore → Rules
- Should show the updated rules with your timestamp

---

## ⚡ Quick Verification

**Test these steps after deploying:**

1. ✅ Login with premium account
2. ✅ Create a vocabulary list
3. ✅ Go to Settings → Cloud Sync
4. ✅ Click "Sync Now"
5. ✅ Should see success message
6. ✅ Check Firestore Console - data should appear

**Your cloud sync should now work perfectly!** 🎉
