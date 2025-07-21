/**
 * Browser console script to restore HTML content for Anki cards
 * Run this directly in your browser console
 */

async function restoreAnkiHTML() {
  const dbName = 'DoshiSenseiLargeData';
  const storeName = 'savedStudyItems';
  
  console.log('🔍 Opening IndexedDB...');
  
  // Open IndexedDB
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  
  console.log('📂 Database opened successfully');
  
  // Start transaction
  const transaction = db.transaction([storeName], 'readwrite');
  const store = transaction.objectStore(storeName);
  
  // Get all items
  const getAllRequest = store.getAll();
  
  return new Promise((resolve, reject) => {
    getAllRequest.onsuccess = async () => {
      const items = getAllRequest.result;
      let updatedCount = 0;
      let checkedCount = 0;
      
      console.log(`📊 Found ${items.length} total items in storage`);
      
      for (const item of items) {
        if (item.itemType === 'anki_card' && item.ankiData) {
          checkedCount++;
          const ankiData = item.ankiData;
          
          // Check if we have raw HTML but the main fields are stripped
          if (ankiData.rawFront && ankiData.rawBack) {
            const frontHasNoTags = !ankiData.front.includes('<') && !ankiData.front.includes('>');
            const rawFrontHasTags = ankiData.rawFront.includes('<') || ankiData.rawFront.includes('>');
            
            if (frontHasNoTags && rawFrontHasTags) {
              console.log(`🔧 Restoring HTML for card: ${item.id.substring(0, 8)}...`);
              console.log(`   Before: ${ankiData.front.substring(0, 50)}...`);
              console.log(`   After:  ${ankiData.rawFront.substring(0, 50)}...`);
              
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
      
      console.log(`✅ Restoration complete!`);
      console.log(`   - Checked ${checkedCount} Anki cards`);
      console.log(`   - Restored HTML for ${updatedCount} cards`);
      console.log(`   - ${checkedCount - updatedCount} cards already had HTML`);
      
      if (updatedCount > 0) {
        console.log('🎉 Refresh the page to see the restored rich content!');
      }
      
      resolve(updatedCount);
    };
    
    getAllRequest.onerror = () => {
      console.error('❌ Failed to read items:', getAllRequest.error);
      reject(getAllRequest.error);
    };
  });
}

// Run the restoration
console.log('🚀 Starting Anki HTML restoration...');
restoreAnkiHTML()
  .then(count => {
    if (count === 0) {
      console.log('ℹ️ No cards needed restoration. Your cards should already display rich content!');
    }
  })
  .catch(error => {
    console.error('❌ Error during restoration:', error);
    console.log('💡 Tip: Make sure you are on the Doshi Sensei website when running this script');
  });