import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

export async function GET() {
  const audit: any = {
    timestamp: new Date().toISOString(),
    tests: {
      firebase: {
        connection: false,
        collections: {},
        testOperations: {}
      },
      serverCapabilities: {
        hasFirestore: false,
        hasAuth: false,
        hasStorage: false
      }
    }
  };

  try {
    // Test 1: Firebase Connection
    if (db) {
      audit.tests.firebase.connection = true;
      audit.tests.serverCapabilities.hasFirestore = true;
      
      // Test 2: List Collections (attempt to read common collections)
      const testCollections = ['users', 'settings', 'progress', 'stories', 'usage'];
      
      for (const collName of testCollections) {
        try {
          const coll = collection(db, collName);
          const snapshot = await getDocs(coll);
          audit.tests.firebase.collections[collName] = {
            exists: true,
            documentCount: snapshot.size,
            empty: snapshot.empty
          };
        } catch (error: any) {
          audit.tests.firebase.collections[collName] = {
            exists: false,
            error: error.code || error.message
          };
        }
      }
      
      // Test 3: Write/Read/Delete Test Document
      try {
        const testId = `audit-test-${Date.now()}`;
        const testData = {
          type: 'storage-audit',
          timestamp: new Date(),
          testValue: Math.random()
        };
        
        // Write
        const testDocRef = doc(db, 'audit-tests', testId);
        await setDoc(testDocRef, testData);
        audit.tests.firebase.testOperations.write = 'success';
        
        // Read
        const docSnap = await getDoc(testDocRef);
        audit.tests.firebase.testOperations.read = docSnap.exists() ? 'success' : 'failed';
        audit.tests.firebase.testOperations.readData = docSnap.data();
        
        // Delete
        await deleteDoc(testDocRef);
        audit.tests.firebase.testOperations.delete = 'success';
        
        // Verify deletion
        const verifySnap = await getDoc(testDocRef);
        audit.tests.firebase.testOperations.verifyDelete = !verifySnap.exists() ? 'success' : 'failed';
        
      } catch (error: any) {
        audit.tests.firebase.testOperations.error = {
          code: error.code,
          message: error.message
        };
      }
      
    } else {
      audit.tests.firebase.connection = false;
      audit.tests.firebase.error = 'Firebase not initialized';
    }
    
  } catch (error: any) {
    audit.error = {
      message: error.message,
      code: error.code,
      stack: error.stack
    };
  }

  return NextResponse.json(audit);
}