import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PracticeHistoryItem } from './types';

const COLLECTION_NAME = 'userPracticeHistory';

export class FirebasePracticeHistoryStorage {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  private getDocId(videoId: string): string {
    return `${this.userId}_${videoId}`;
  }

  async addOrUpdateItem(item: PracticeHistoryItem): Promise<void> {
    const docId = this.getDocId(item.videoId);
    const docRef = doc(db, COLLECTION_NAME, docId);
    
    console.log('=== Firebase Practice History Save ===');
    console.log('Collection:', COLLECTION_NAME);
    console.log('Doc ID:', docId);
    console.log('User ID:', this.userId);
    console.log('Item:', item);
    
    try {
      // Check if document exists
      const docSnap = await getDoc(docRef);
      console.log('Document exists:', docSnap.exists());
      
      if (docSnap.exists()) {
        // Update existing item
        const existingData = docSnap.data();
        await setDoc(docRef, {
          ...item,
          id: docId,
          userId: this.userId,
          practiceCount: (existingData.practiceCount || 0) + 1,
          lastPracticed: Timestamp.fromDate(item.lastPracticed),
          firstPracticed: existingData.firstPracticed || Timestamp.fromDate(item.firstPracticed),
          totalPracticeTime: (existingData.totalPracticeTime || 0) + (item.totalPracticeTime || 0),
          updatedAt: serverTimestamp()
        }, { merge: true });
        console.log('✅ Successfully updated practice history in Firebase');
      } else {
        // Create new item
        await setDoc(docRef, {
          ...item,
          id: docId,
          userId: this.userId,
          firstPracticed: Timestamp.fromDate(item.firstPracticed),
          lastPracticed: Timestamp.fromDate(item.lastPracticed),
          practiceCount: 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log('✅ Successfully created new practice history in Firebase');
      }
    } catch (error: any) {
      console.error('❌ Error saving practice history to Firebase:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      if (error.code === 'permission-denied') {
        console.error('Permission denied - user may not be authenticated or rules may be blocking the write');
      }
      
      throw error;
    }
  }

  async getItem(videoId: string): Promise<PracticeHistoryItem | null> {
    const docId = this.getDocId(videoId);
    const docRef = doc(db, COLLECTION_NAME, docId);
    
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ...data,
          lastPracticed: data.lastPracticed?.toDate() || new Date(),
          firstPracticed: data.firstPracticed?.toDate() || new Date()
        } as PracticeHistoryItem;
      }
      return null;
    } catch (error) {
      console.error('Error getting practice history item:', error);
      return null;
    }
  }

  async getAllItems(): Promise<PracticeHistoryItem[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', this.userId),
        orderBy('lastPracticed', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const items: PracticeHistoryItem[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          ...data,
          lastPracticed: data.lastPracticed?.toDate() || new Date(),
          firstPracticed: data.firstPracticed?.toDate() || new Date()
        } as PracticeHistoryItem);
      });
      
      return items;
    } catch (error) {
      console.error('Error getting all practice history items:', error);
      return [];
    }
  }

  async deleteItem(videoId: string): Promise<void> {
    const docId = this.getDocId(videoId);
    const docRef = doc(db, COLLECTION_NAME, docId);
    
    try {
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting practice history item:', error);
      throw error;
    }
  }

  async clearAll(): Promise<void> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', this.userId)
      );
      
      const querySnapshot = await getDocs(q);
      const deletePromises: Promise<void>[] = [];
      
      querySnapshot.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error clearing practice history:', error);
      throw error;
    }
  }

  async getItemsByDateRange(startDate: Date, endDate: Date): Promise<PracticeHistoryItem[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', this.userId),
        where('lastPracticed', '>=', Timestamp.fromDate(startDate)),
        where('lastPracticed', '<=', Timestamp.fromDate(endDate)),
        orderBy('lastPracticed', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const items: PracticeHistoryItem[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          ...data,
          lastPracticed: data.lastPracticed?.toDate() || new Date(),
          firstPracticed: data.firstPracticed?.toDate() || new Date()
        } as PracticeHistoryItem);
      });
      
      return items;
    } catch (error) {
      console.error('Error getting practice history by date range:', error);
      return [];
    }
  }

  async getMostPracticed(limitCount: number = 10): Promise<PracticeHistoryItem[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', this.userId),
        orderBy('practiceCount', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const items: PracticeHistoryItem[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          ...data,
          lastPracticed: data.lastPracticed?.toDate() || new Date(),
          firstPracticed: data.firstPracticed?.toDate() || new Date()
        } as PracticeHistoryItem);
      });
      
      return items;
    } catch (error) {
      console.error('Error getting most practiced items:', error);
      return [];
    }
  }

  // Sync from IndexedDB to Firebase (for when users upgrade)
  async syncFromLocal(localItems: PracticeHistoryItem[]): Promise<void> {
    try {
      const promises = localItems.map(item => this.addOrUpdateItem(item));
      await Promise.all(promises);
    } catch (error) {
      console.error('Error syncing from local to Firebase:', error);
      throw error;
    }
  }
}