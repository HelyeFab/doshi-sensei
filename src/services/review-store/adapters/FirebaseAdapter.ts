/**
 * Firebase Storage Adapter
 * Remote storage implementation using Firebase Firestore
 */

import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs,
  writeBatch,
  serverTimestamp,
  Timestamp,
  DocumentData,
  QueryConstraint,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { StorageAdapter } from '../types';

export class FirebaseAdapter implements StorageAdapter {
  private collectionName: string;
  private batchQueue: Array<() => Promise<void>> = [];
  private batchInterval?: NodeJS.Timeout;
  private maxBatchSize = 500; // Firestore limit

  constructor(collectionName: string = 'review_hub') {
    this.collectionName = collectionName;
    this.startBatchProcessor();
  }

  async get(key: string): Promise<any> {
    try {
      const docRef = doc(db, this.collectionName, this.sanitizeKey(key));
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      const data = docSnap.data();
      return this.deserializeData(data);
    } catch (error) {
      console.error('[FirebaseAdapter] Get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const sanitizedKey = this.sanitizeKey(key);
      const docRef = doc(db, this.collectionName, sanitizedKey);
      
      const data = this.serializeData(value);
      
      // Add metadata
      const docData: DocumentData = {
        ...data,
        _id: sanitizedKey,
        _updatedAt: serverTimestamp(),
        _version: (data._version || 0) + 1
      };
      
      // Add TTL if specified
      if (ttl) {
        const expiresAt = new Date(Date.now() + ttl);
        docData._expiresAt = Timestamp.fromDate(expiresAt);
      }
      
      await setDoc(docRef, docData, { merge: true });
    } catch (error) {
      console.error('[FirebaseAdapter] Set error:', error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, this.sanitizeKey(key));
      await deleteDoc(docRef);
    } catch (error) {
      console.error('[FirebaseAdapter] Delete error:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      // Get all documents
      const q = query(collection(db, this.collectionName));
      const querySnapshot = await getDocs(q);
      
      // Delete in batches
      const batch = writeBatch(db);
      let count = 0;
      
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
        count++;
        
        // Firestore has a limit of 500 operations per batch
        if (count >= this.maxBatchSize) {
          throw new Error('Too many documents to clear at once');
        }
      });
      
      await batch.commit();
      console.log(`[FirebaseAdapter] Cleared ${count} documents`);
    } catch (error) {
      console.error('[FirebaseAdapter] Clear error:', error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const docRef = doc(db, this.collectionName, this.sanitizeKey(key));
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return false;
      }
      
      // Check if expired
      const data = docSnap.data();
      if (data._expiresAt) {
        const expiresAt = data._expiresAt.toDate();
        if (expiresAt < new Date()) {
          // Delete expired document
          await deleteDoc(docRef);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('[FirebaseAdapter] Exists error:', error);
      return false;
    }
  }

  /**
   * Query documents by field value
   */
  async queryByField(fieldPath: string, value: any): Promise<any[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where(fieldPath, '==', value)
      );
      
      const querySnapshot = await getDocs(q);
      const results: any[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Skip expired documents
        if (data._expiresAt) {
          const expiresAt = data._expiresAt.toDate();
          if (expiresAt < new Date()) {
            return;
          }
        }
        
        results.push(this.deserializeData(data));
      });
      
      return results;
    } catch (error) {
      console.error('[FirebaseAdapter] Query error:', error);
      return [];
    }
  }

  /**
   * Query documents with multiple constraints
   */
  async queryComplex(constraints: QueryConstraint[]): Promise<any[]> {
    try {
      const q = query(collection(db, this.collectionName), ...constraints);
      const querySnapshot = await getDocs(q);
      const results: any[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        results.push(this.deserializeData(data));
      });
      
      return results;
    } catch (error) {
      console.error('[FirebaseAdapter] Complex query error:', error);
      return [];
    }
  }

  /**
   * Get documents modified after a certain date
   */
  async getModifiedSince(since: Date, userId?: string): Promise<any[]> {
    try {
      const constraints: QueryConstraint[] = [
        where('_updatedAt', '>', Timestamp.fromDate(since)),
        orderBy('_updatedAt', 'asc'),
        limit(100)
      ];
      
      if (userId) {
        constraints.push(where('userId', '==', userId));
      }
      
      return await this.queryComplex(constraints);
    } catch (error) {
      console.error('[FirebaseAdapter] GetModifiedSince error:', error);
      return [];
    }
  }

  /**
   * Batch write operations for efficiency
   */
  async batchWrite(operations: Array<{
    type: 'set' | 'update' | 'delete';
    key: string;
    value?: any;
  }>): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      for (const op of operations) {
        const docRef = doc(db, this.collectionName, this.sanitizeKey(op.key));
        
        switch (op.type) {
          case 'set':
            batch.set(docRef, this.serializeData(op.value));
            break;
          case 'update':
            batch.update(docRef, this.serializeData(op.value));
            break;
          case 'delete':
            batch.delete(docRef);
            break;
        }
      }
      
      await batch.commit();
      console.log(`[FirebaseAdapter] Batch write completed: ${operations.length} operations`);
    } catch (error) {
      console.error('[FirebaseAdapter] Batch write error:', error);
      throw error;
    }
  }

  /**
   * Listen to real-time changes (for sync)
   */
  onSnapshot(
    key: string,
    callback: (data: any) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    const docRef = doc(db, this.collectionName, this.sanitizeKey(key));
    
    // Import onSnapshot dynamically to avoid issues
    import('firebase/firestore').then(({ onSnapshot }) => {
      const unsubscribe = onSnapshot(
        docRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = this.deserializeData(docSnap.data());
            callback(data);
          } else {
            callback(null);
          }
        },
        (error) => {
          console.error('[FirebaseAdapter] Snapshot error:', error);
          errorCallback?.(error);
        }
      );
      
      return unsubscribe;
    });
    
    // Return dummy unsubscribe for now
    return () => {};
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    documentCount: number;
    collections: string[];
    oldestDocument?: Date;
    newestDocument?: Date;
  }> {
    try {
      const q = query(collection(db, this.collectionName));
      const querySnapshot = await getDocs(q);
      
      let oldest: Date | undefined;
      let newest: Date | undefined;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data._updatedAt) {
          const updatedAt = data._updatedAt.toDate();
          if (!oldest || updatedAt < oldest) {
            oldest = updatedAt;
          }
          if (!newest || updatedAt > newest) {
            newest = updatedAt;
          }
        }
      });
      
      return {
        documentCount: querySnapshot.size,
        collections: [this.collectionName],
        oldestDocument: oldest,
        newestDocument: newest
      };
    } catch (error) {
      console.error('[FirebaseAdapter] GetStats error:', error);
      return {
        documentCount: 0,
        collections: []
      };
    }
  }

  /**
   * Sanitize key for Firestore document ID
   */
  private sanitizeKey(key: string): string {
    // Firestore document IDs cannot contain forward slashes
    return key.replace(/\//g, '__');
  }

  /**
   * Serialize data for Firestore
   */
  private serializeData(data: any): DocumentData {
    if (!data) return {};
    
    // Convert Date objects to Timestamps
    const serialized = JSON.parse(JSON.stringify(data, (key, value) => {
      if (value instanceof Date) {
        return { _isDate: true, value: value.toISOString() };
      }
      return value;
    }));
    
    return serialized;
  }

  /**
   * Deserialize data from Firestore
   */
  private deserializeData(data: DocumentData): any {
    if (!data) return null;
    
    // Convert Timestamps back to Dates
    const deserialized = JSON.parse(JSON.stringify(data), (key, value) => {
      if (value && typeof value === 'object' && value._isDate) {
        return new Date(value.value);
      }
      if (value && typeof value === 'object' && value.seconds) {
        // Firestore Timestamp
        return new Date(value.seconds * 1000);
      }
      return value;
    });
    
    // Remove internal fields
    delete deserialized._id;
    delete deserialized._updatedAt;
    delete deserialized._expiresAt;
    delete deserialized._version;
    
    return deserialized;
  }

  /**
   * Start batch processor for queued operations
   */
  private startBatchProcessor(): void {
    this.batchInterval = setInterval(() => {
      this.processBatchQueue();
    }, 5000); // Process every 5 seconds
  }

  /**
   * Process queued batch operations
   */
  private async processBatchQueue(): Promise<void> {
    if (this.batchQueue.length === 0) return;
    
    const operations = [...this.batchQueue];
    this.batchQueue = [];
    
    try {
      await Promise.all(operations.map(op => op()));
      console.log(`[FirebaseAdapter] Processed ${operations.length} queued operations`);
    } catch (error) {
      console.error('[FirebaseAdapter] Batch processing error:', error);
      // Re-queue failed operations
      this.batchQueue.unshift(...operations);
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = undefined;
    }
    
    // Process remaining batch operations
    this.processBatchQueue();
  }
}