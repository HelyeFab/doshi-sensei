#!/usr/bin/env node

/**
 * Test script for sync functionality
 * This script helps debug and test the sync adapter
 */

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-admin-key.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
  });
}

const db = admin.firestore();

async function testSync() {
  console.log('🔍 Testing sync functionality...\n');
  
  try {
    // Test user ID (you'll need to replace this with an actual user ID)
    const userId = 'test-user-id'; // Replace with actual user ID
    
    // 1. Check if user has a manifest
    console.log('1. Checking for user manifest...');
    const manifestRef = db.doc(`userSync/${userId}/manifest`);
    const manifestDoc = await manifestRef.get();
    
    if (manifestDoc.exists) {
      const manifest = manifestDoc.data();
      console.log('✅ Manifest found:');
      console.log(`   - Last sync: ${new Date(manifest.lastSyncTimestamp).toLocaleString()}`);
      console.log(`   - Resources: ${Object.keys(manifest.resources || {}).length}`);
      console.log(`   - Total size: ${manifest.totalSize || 0} bytes`);
    } else {
      console.log('❌ No manifest found for user');
    }
    
    // 2. Check user resources
    console.log('\n2. Checking user resources...');
    const resourcesRef = db.collection(`userSync/${userId}/userResources`);
    const resourcesSnapshot = await resourcesRef.limit(5).get();
    
    if (!resourcesSnapshot.empty) {
      console.log(`✅ Found ${resourcesSnapshot.size} resources (showing first 5):`);
      resourcesSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${doc.id}: ${data.resource?.type || 'unknown'} (${data.resource?.metadata?.size || 0} bytes)`);
      });
    } else {
      console.log('❌ No resources found for user');
    }
    
    // 3. Create a test resource to upload
    console.log('\n3. Creating test resource...');
    const testResource = {
      id: `article-test-${Date.now()}`,
      type: 'article',
      data: {
        title: 'Test Article',
        content: 'This is a test article for sync testing',
        slug: 'test-article',
        publishedAt: Date.now()
      },
      metadata: {
        size: 1024,
        cachedAt: Date.now(),
        lastAccessed: Date.now(),
        version: '1.0.0',
        checksum: 'test-checksum',
        expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000)
      }
    };
    
    // 4. Upload test resource
    console.log('\n4. Uploading test resource...');
    const resourceDocRef = db.doc(`userSync/${userId}/userResources/${testResource.id}`);
    await resourceDocRef.set({
      resource: testResource,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Test resource uploaded successfully');
    
    // 5. Update manifest
    console.log('\n5. Updating manifest...');
    const updatedManifest = {
      userId,
      lastSyncTimestamp: Date.now(),
      resources: {
        [testResource.id]: {
          type: testResource.type,
          version: testResource.metadata.version,
          checksum: testResource.metadata.checksum,
          lastModified: testResource.metadata.lastAccessed,
          size: testResource.metadata.size
        }
      },
      totalSize: testResource.metadata.size,
      resourceCount: 1
    };
    
    await manifestRef.set(updatedManifest, { merge: true });
    console.log('✅ Manifest updated successfully');
    
    console.log('\n✨ Sync test completed! You can now test the sync functionality in the app.');
    console.log(`   User ID: ${userId}`);
    console.log(`   Test resource ID: ${testResource.id}`);
    
  } catch (error) {
    console.error('❌ Error during sync test:', error);
  }
}

// Run the test
testSync()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });