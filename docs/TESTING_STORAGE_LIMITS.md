# Testing Storage Limits for Different User Types

## 1. Browser DevTools Testing

### Open IndexedDB Inspector
1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. Look for **Storage** → **IndexedDB** → `doshi-sensei-db`
4. You should see stores like: `apiCache`, `articles`, `stories`, etc.

### Check Storage by User Type

#### Guest Users (Not Logged In)
```javascript
// Run in browser console
async function testGuestLimits() {
  // Check current storage
  const db = await window.indexedDB.open('doshi-sensei-db');
  console.log('IndexedDB opened:', db.name);
  
  // Get storage estimate
  const estimate = await navigator.storage.estimate();
  console.log('Storage used:', (estimate.usage / 1024 / 1024).toFixed(2), 'MB');
  console.log('Storage quota:', (estimate.quota / 1024 / 1024).toFixed(2), 'MB');
  
  // Check cached items
  const tx = db.transaction(['apiCache'], 'readonly');
  const store = tx.objectStore('apiCache');
  const count = await store.count();
  console.log('Cached items:', count);
}

testGuestLimits();
```

#### Free Users (Logged In, No Subscription)
```javascript
// Check user type and limits
async function checkUserLimits() {
  const user = auth.currentUser;
  console.log('User ID:', user?.uid);
  console.log('Email:', user?.email);
  
  // Check Firestore user data
  const userDoc = await db.collection('users').doc(user.uid).get();
  const userData = userDoc.data();
  console.log('Subscription:', userData.subscription);
  console.log('Limits:', userData.limits);
}
```

## 2. Manual Testing Scenarios

### A. Guest User Testing
1. **Open Incognito/Private Window** (no login)
2. Visit `/articles` and read 3-4 articles
3. Check DevTools → Application → IndexedDB
4. Verify:
   - Only 3 articles are cached (guest limit)
   - Oldest article is evicted when reading 4th
   - No sync attempts (no Firebase errors)

### B. Free User Testing
1. **Create new test account** or use existing free account
2. Login and visit `/articles`
3. Read 4-5 articles
4. Check IndexedDB:
   - Should see 3 articles cached (free limit)
   - LRU eviction working
   - No sync to Firebase

### C. Storage Limit Testing
```javascript
// Force eviction testing
async function testEviction() {
  // Import the storage manager
  const { EnhancedStorageManager2 } = await import('/src/utils/enhancedStorageManager2.js');
  
  // Try to cache multiple articles
  for (let i = 1; i <= 5; i++) {
    const fakeArticle = {
      id: `test-article-${i}`,
      type: 'article',
      data: { title: `Test Article ${i}`, content: 'Lorem ipsum...' },
      metadata: {
        size: 1024 * 1024, // 1MB
        cachedAt: Date.now(),
        lastAccessed: Date.now(),
        version: 1,
        checksum: 'test',
        expiresAt: Date.now() + 86400000
      }
    };
    
    try {
      await EnhancedStorageManager2.cacheResource(fakeArticle);
      console.log(`Cached article ${i}`);
    } catch (error) {
      console.error(`Failed to cache article ${i}:`, error);
    }
  }
  
  // Check what's actually cached
  const cached = await EnhancedStorageManager2.getResourcesByType('article');
  console.log('Cached articles:', cached.length);
  console.log('Article IDs:', cached.map(a => a.id));
}
```

## 3. Automated Test Script

Create this test page at `/test-storage.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Storage Test</title>
</head>
<body>
  <h1>Storage Limit Tester</h1>
  <div id="user-info"></div>
  <div id="storage-info"></div>
  <button onclick="testStorage()">Test Storage Limits</button>
  <div id="results"></div>

  <script type="module">
    import { EnhancedStorageManager2 } from './src/utils/enhancedStorageManager2.js';
    
    window.testStorage = async function() {
      const results = document.getElementById('results');
      results.innerHTML = '<h3>Testing...</h3>';
      
      // Get current user type
      const userType = localStorage.getItem('userType') || 'guest';
      
      // Expected limits
      const limits = {
        guest: { articles: 3, stories: 3 },
        free: { articles: 3, stories: 3 },
        premium: { articles: 50, stories: 50 }
      };
      
      // Test article caching
      let cachedCount = 0;
      for (let i = 1; i <= 5; i++) {
        try {
          await EnhancedStorageManager2.cacheResource({
            id: `test-${i}`,
            type: 'article',
            data: { title: `Test ${i}` },
            metadata: {
              size: 1024 * 1024,
              cachedAt: Date.now(),
              lastAccessed: Date.now(),
              version: 1,
              checksum: 'test',
              expiresAt: Date.now() + 86400000
            }
          });
          cachedCount++;
        } catch (e) {
          console.error('Cache failed:', e);
        }
      }
      
      const cached = await EnhancedStorageManager2.getResourcesByType('article');
      
      results.innerHTML = `
        <h3>Results:</h3>
        <p>User Type: ${userType}</p>
        <p>Expected Limit: ${limits[userType].articles} articles</p>
        <p>Actually Cached: ${cached.length} articles</p>
        <p>Test ${cached.length === limits[userType].articles ? 'PASSED ✅' : 'FAILED ❌'}</p>
      `;
    };
  </script>
</body>
</html>
```

## 4. Monitoring in Production

### Add Analytics Events
```typescript
// In your caching logic
async function trackCacheEvent(action: string, resourceType: string, userType: string) {
  analytics.track('cache_event', {
    action, // 'cached', 'evicted', 'failed'
    resourceType,
    userType,
    timestamp: Date.now()
  });
}
```

### Console Logging for Debugging
```typescript
// Add to EnhancedStorageManager2
static async debugStorage() {
  const estimate = await navigator.storage.estimate();
  const db = await this.openDB();
  const tx = db.transaction(['apiCache'], 'readonly');
  const store = tx.objectStore('apiCache');
  const items = await store.getAll();
  
  console.group('🗄️ Storage Debug Info');
  console.log('Storage Used:', (estimate.usage / 1024 / 1024).toFixed(2), 'MB');
  console.log('Storage Quota:', (estimate.quota / 1024 / 1024 / 1024).toFixed(2), 'GB');
  console.log('Cached Items:', items.length);
  console.table(items.map(item => ({
    id: item.id,
    type: item.endpoint,
    size: (item.size / 1024).toFixed(2) + ' KB',
    cached: new Date(item.timestamp).toLocaleString()
  })));
  console.groupEnd();
}

// Users can run this in console:
// EnhancedStorageManager2.debugStorage()
```

## 5. Quick Verification Commands

Run these in the browser console:

```javascript
// 1. Check if IndexedDB exists
indexedDB.databases().then(dbs => console.log('Databases:', dbs));

// 2. Check specific database
const db = await indexedDB.open('doshi-sensei-db');
console.log('DB Version:', db.version);
console.log('Object Stores:', Array.from(db.objectStoreNames));

// 3. Count cached items
async function countCached() {
  const db = await indexedDB.open('doshi-sensei-db');
  const tx = db.transaction(['apiCache'], 'readonly');
  const count = await tx.objectStore('apiCache').count();
  console.log('Total cached items:', count);
}
countCached();

// 4. Check user type
console.log('User Type:', localStorage.getItem('userType') || 'guest');
```

## Expected Behavior Summary

| User Type | Articles | Stories | Sync | Firebase |
|-----------|----------|---------|------|----------|
| Guest     | 3 max    | 3 max   | No   | No access |
| Free      | 3 max    | 3 max   | No   | Read only |
| Premium   | 50 max   | 50 max  | Yes  | Full access |

When limits are reached, LRU eviction should remove the oldest accessed item automatically.