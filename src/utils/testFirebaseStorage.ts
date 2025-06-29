import { storage } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export async function testFirebaseStorageConnection() {
  try {
    console.log('Testing Firebase Storage connection...');
    
    // Check if storage is initialized
    if (!storage) {
      console.error('Firebase Storage is not initialized');
      return false;
    }
    
    console.log('Storage object:', storage);
    console.log('Storage bucket:', storage.app.options.storageBucket);
    
    // Try to create a reference
    const testRef = ref(storage, 'test/connection-test.txt');
    console.log('Created test reference:', testRef);
    
    // Try to upload a simple text file
    const testData = 'Firebase Storage connection test';
    const snapshot = await uploadString(testRef, testData);
    console.log('Upload successful:', snapshot);
    
    // Try to get download URL
    const url = await getDownloadURL(snapshot.ref);
    console.log('Download URL:', url);
    
    return true;
  } catch (error: any) {
    console.error('Firebase Storage test failed:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    return false;
  }
}