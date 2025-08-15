import { storage } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export async function testFirebaseStorageConnection() {
  try {

    // Check if storage is initialized
    if (!storage) {
      console.error('Firebase Storage is not initialized');
      return false;
    }

    // Try to create a reference
    const testRef = ref(storage, 'test/connection-test.txt');

    // Try to upload a simple text file
    const testData = 'Firebase Storage connection test';
    const snapshot = await uploadString(testRef, testData);

    // Try to get download URL
    const url = await getDownloadURL(snapshot.ref);

    return true;
  } catch (error: any) {
    console.error('Firebase Storage test failed:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    return false;
  }
}