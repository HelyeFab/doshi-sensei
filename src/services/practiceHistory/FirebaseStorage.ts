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
    
    try {
      // Check if document exists
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        // Update existing item
        const existingData = docSnap.data();
        await setDoc(docRef, {
          ...item,
          id: docId,
          userId: this.userId,
          practiceCount: (existingData.practiceCount || 0) + 1,
          lastPracticed: serverTimestamp(),
          totalPracticeTime: (existingData.totalPracticeTime || 0) + (item.totalPracticeTime || 0),
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        // Create new item
        await setDoc(docRef, {
          ...item,
          id: docId,
          userId: this.userId,
          firstPracticed: serverTimestamp(),
          lastPracticed: serverTimestamp(),
          practiceCount: 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error saving practice history to Firebase:', error);
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