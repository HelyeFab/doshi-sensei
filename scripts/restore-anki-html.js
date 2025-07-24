/**
 * Script to restore HTML content for Anki cards that were imported with stripped HTML
 * This uses the rawFront and rawBack fields that were preserved during import
 */

const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');

// Initialize Firebase (copy your config from src/lib/firebase.ts)
const firebaseConfig = {
  // Add your config here
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function restoreAnkiHTML() {
  console.log('🔍 Checking for Anki cards with stripped HTML...');
  
  // This would need to be run in a browser context to access IndexedDB
  // For now, this is a template showing how to restore the data
  
  console.log(`
To restore HTML content for existing Anki cards:

1. Open the browser console on your site
2. Run this code:

async function restoreAnkiHTML() {
  const dbName = 'DoshiSenseiLargeData';
  const storeName = 'savedStudyItems';
  
  // Open IndexedDB
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  
  // Start transaction
  const transaction = db.transaction([storeName], 'readwrite');
  const store = transaction.objectStore(storeName);
  
  // Get all items
  const getAllRequest = store.getAll();
  
  getAllRequest.onsuccess = async () => {
    const items = getAllRequest.result;
    let updatedCount = 0;
    
    for (const item of items) {
      if (item.itemType === 'anki_card' && item.ankiData) {
        const ankiData = item.ankiData;
        
        // Check if we have raw HTML but the main fields are stripped
        if (ankiData.rawFront && ankiData.rawBack) {
          const frontHasNoTags = !ankiData.front.includes('<') && !ankiData.front.includes('>');
          const rawFrontHasTags = ankiData.rawFront.includes('<') || ankiData.rawFront.includes('>');
          
          if (frontHasNoTags && rawFrontHasTags) {
            console.log(\`Restoring HTML for card: \${item.id}\`);
            
            // Restore the HTML content
            ankiData.front = ankiData.rawFront;
            ankiData.back = ankiData.rawBack;
            
            // Update in IndexedDB
            const updateRequest = store.put(item);
            await new Promise((resolve, reject) => {
              updateRequest.onsuccess = resolve;
              updateRequest.onerror = reject;
            });
            
            updatedCount++;
          }
        }
      }
    }
    
    console.log(\`✅ Restored HTML for \${updatedCount} cards\`);
  };
  
  getAllRequest.onerror = () => {
    console.error('Failed to read items:', getAllRequest.error);
  };
}

// Run the restoration
restoreAnkiHTML();
  `);
}

restoreAnkiHTML();