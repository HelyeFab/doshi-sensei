# Netlify Functions Analysis: Working vs Non-Working Scrapers

## Key Differences Identified

### 1. **Module Loading Pattern** (CRITICAL DIFFERENCE)

**Working Function (scrape-watanoc-working.js):**
```javascript
const admin = require('firebase-admin');  // At module level

// All initialization at module level
let firebaseInitialized = false;
let db = null;
```

**Non-Working Functions (scrape-nhk-easy.js, scrape-todaii-news.js):**
```javascript
// No requires at module level

function initializeFirebaseIfNeeded() {
  const admin = require('firebase-admin');  // Dynamic require inside function
  // ...
}
```

### 2. **Firebase Initialization Pattern**

**Working Function:**
- Initializes Firebase at module level
- Checks `!admin.apps.length` before initialization
- Simple, straightforward initialization

**Non-Working Functions:**
- Lazy initialization inside functions
- Complex conditional logic
- Dynamic requires may fail in Netlify's environment

### 3. **Additional Dynamic Requires**

**Non-Working scrape-nhk-easy.js:**
```javascript
handler = async function (event, context) {
  const fetch = require('node-fetch');  // Dynamic require
  // ...
}
```

### 4. **Error Handling Structure**

**Working Function:**
- Simple try-catch in handler
- Clear error messages
- Proper status codes

**Non-Working Functions:**
- Complex nested try-catch blocks
- Top-level error handlers that might mask issues

### 5. **CORS Handling**

**Working Function:**
- Properly handles OPTIONS preflight requests
- Clear CORS headers defined

**Non-Working Functions:**
- Missing CORS handling (could cause issues with browser requests)

## Root Cause

The primary issue appears to be **dynamic requires**. Netlify Functions run in a specific environment where:
1. All dependencies must be resolvable at build time
2. Dynamic requires inside functions may not work properly
3. The module loading context differs from regular Node.js

## Solution

To fix the non-working functions, they should be refactored to follow the pattern of the working function:

1. Move all `require()` statements to the top of the file
2. Initialize Firebase at module level, not inside functions
3. Avoid conditional/dynamic requires
4. Add proper CORS handling
5. Simplify the initialization flow

## Example Fix Pattern

```javascript
// All requires at the top
const admin = require('firebase-admin');
const https = require('https');
const { URL } = require('url');

// Module-level initialization
let firebaseInitialized = false;
let db = null;

// Initialize Firebase immediately
if (!admin.apps.length) {
  try {
    const serviceAccount = {
      // ... service account config
    };
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    firebaseInitialized = true;
    db = admin.firestore();
  } catch (error) {
    console.error('Firebase init error:', error);
  }
}

// Simple handler
exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Handle OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Main logic here...
};
