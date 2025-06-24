'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MoodBoard } from '@/types/moodBoard';
import moodBoardsData from '@/data/moodBoards.json';
import { logAdminAction } from '@/utils/adminLogs';

interface UseMoodBoardsReturn {
  moodBoards: MoodBoard[];
  loading: boolean;
  error: string | null;
  refreshMoodBoards: () => Promise<void>;
  createMoodBoard: (board: Omit<MoodBoard, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateMoodBoard: (id: string, updates: Partial<MoodBoard>) => Promise<void>;
  deleteMoodBoard: (id: string) => Promise<void>;
  toggleMoodBoardStatus: (id: string, isActive: boolean) => Promise<void>;
}

// Interface for Firebase mood board document
interface FirebaseMoodBoard {
  id: string;
  title?: string;
  emoji?: string;
  jlpt?: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  background?: string;
  description?: string;
  kanji?: any[];
  createdAt?: any; // Firestore timestamp
  updatedAt?: any; // Firestore timestamp
  createdBy?: string;
  isActive?: boolean;
  sortOrder?: number;
  [key: string]: any;
}

// Convert Firestore timestamp to Date
function timestampToDate(timestamp: any): Date {
  if (!timestamp) return new Date();
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  if (timestamp?.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  return new Date();
}

// Convert Firebase mood board to MoodBoard
function convertFirebaseMoodBoard(fireboardMoodBoard: FirebaseMoodBoard): MoodBoard {
  return {
    id: fireboardMoodBoard.id,
    title: fireboardMoodBoard.title || 'Untitled',
    emoji: fireboardMoodBoard.emoji || '🎨',
    jlpt: fireboardMoodBoard.jlpt || 'N5',
    background: fireboardMoodBoard.background || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    description: fireboardMoodBoard.description || '',
    kanji: fireboardMoodBoard.kanji || [],
    createdAt: timestampToDate(fireboardMoodBoard.createdAt),
    updatedAt: fireboardMoodBoard.updatedAt ? timestampToDate(fireboardMoodBoard.updatedAt) : undefined,
    createdBy: fireboardMoodBoard.createdBy || 'admin',
    isActive: fireboardMoodBoard.isActive ?? true,
    sortOrder: fireboardMoodBoard.sortOrder || 0,
  };
}

// Convert JSON mood board data to MoodBoard format
function convertJsonMoodBoard(key: string, jsonBoard: any): MoodBoard {
  return {
    id: key,
    title: jsonBoard.title || key,
    emoji: jsonBoard.emoji || '🎨',
    jlpt: jsonBoard.jlpt || 'N5',
    background: jsonBoard.background || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    description: jsonBoard.description || '',
    kanji: jsonBoard.kanji?.map((k: any) => ({
      char: typeof k === 'string' ? k : k.char,
      meaning: typeof k === 'string' ? '' : k.meaning || '',
      readings: typeof k === 'string' ? { on: [], kun: [] } : k.readings || { on: [], kun: [] },
      examples: typeof k === 'string' ? [] : k.examples || [],
      difficulty: typeof k === 'string' ? 1 : k.difficulty || 1,
    })) || [],
    createdAt: new Date('2024-01-01'), // Default date for JSON data
    updatedAt: undefined,
    createdBy: 'admin',
    isActive: true,
    sortOrder: 0,
  };
}

export function useMoodBoards(): UseMoodBoardsReturn {
  const [moodBoards, setMoodBoards] = useState<MoodBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMoodBoards = async () => {
    try {
      setError(null);

      if (!db) {
        // Fallback to JSON data if Firebase is not available
        console.warn('Firebase not initialized, using static mood board data');
        const jsonMoodBoards = Object.entries(moodBoardsData).map(([key, board]) =>
          convertJsonMoodBoard(key, board)
        );
        setMoodBoards(jsonMoodBoards);
        setLoading(false);
        return;
      }

      const moodBoardsRef = collection(db, 'moodBoards');
      const q = query(moodBoardsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      const fetchedMoodBoards: MoodBoard[] = snapshot.docs.map(doc => {
        const firebaseMoodBoard: FirebaseMoodBoard = {
          id: doc.id,
          ...doc.data()
        };
        return convertFirebaseMoodBoard(firebaseMoodBoard);
      });

      // Sort by sortOrder first, then by createdAt (in JavaScript to avoid composite index requirement)
      fetchedMoodBoards.sort((a, b) => {
        const aSortOrder = a.sortOrder || 0;
        const bSortOrder = b.sortOrder || 0;
        if (aSortOrder !== bSortOrder) {
          return aSortOrder - bSortOrder;
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      // If no Firestore data, migrate from JSON
      if (fetchedMoodBoards.length === 0) {
        console.log('No Firestore mood boards found, migrating from JSON...');
        await migrateJsonToFirestore();
        return fetchMoodBoards(); // Retry after migration
      }

      setMoodBoards(fetchedMoodBoards);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching mood boards:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch mood boards');

      // Fallback to JSON data on error
      try {
        const jsonMoodBoards = Object.entries(moodBoardsData).map(([key, board]) =>
          convertJsonMoodBoard(key, board)
        );
        setMoodBoards(jsonMoodBoards);
      } catch (jsonError) {
        console.error('Failed to load JSON fallback data:', jsonError);
      }

      setLoading(false);
    }
  };

  const migrateJsonToFirestore = async () => {
    if (!db) return;

    try {
      const moodBoardsRef = collection(db, 'moodBoards');
      const migrationPromises = Object.entries(moodBoardsData).map(async ([key, board], index) => {
        const moodBoardData = {
          title: board.title || key,
          emoji: board.emoji || '🎨',
          jlpt: board.jlpt || 'N5',
          background: board.background || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          description: board.description || '',
          kanji: board.kanji || [],
          createdAt: Timestamp.now(),
          createdBy: 'admin',
          isActive: true,
          sortOrder: index,
        };

        await addDoc(moodBoardsRef, moodBoardData);
      });

      await Promise.all(migrationPromises);
      console.log('Successfully migrated mood boards from JSON to Firestore');
    } catch (error) {
      console.error('Failed to migrate mood boards:', error);
      throw error;
    }
  };

  const refreshMoodBoards = async () => {
    setLoading(true);
    await fetchMoodBoards();
  };

  const createMoodBoard = async (board: Omit<MoodBoard, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    try {
      const moodBoardsRef = collection(db, 'moodBoards');
      const newBoard = {
        ...board,
        createdAt: Timestamp.now(),
        createdBy: 'admin',
        isActive: board.isActive ?? true,
        sortOrder: board.sortOrder ?? 0,
      };

      const docRef = await addDoc(moodBoardsRef, newBoard);
      
      // Log admin action
      await logAdminAction({
        action: 'mood_board_created',
        targetMoodBoardId: docRef.id,
        details: {
          title: board.title,
          jlpt: board.jlpt,
          kanjiCount: board.kanji?.length || 0,
        },
      });
      
      await refreshMoodBoards();
      return docRef.id;
    } catch (err) {
      console.error('Error creating mood board:', err);
      throw new Error(err instanceof Error ? err.message : 'Failed to create mood board');
    }
  };

  const updateMoodBoard = async (id: string, updates: Partial<MoodBoard>): Promise<void> => {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    try {
      const moodBoardRef = doc(db, 'moodBoards', id);
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(moodBoardRef, updateData);
      
      // Log admin action
      await logAdminAction({
        action: 'mood_board_updated',
        targetMoodBoardId: id,
        details: {
          updatedFields: Object.keys(updates),
          title: updates.title,
          jlpt: updates.jlpt,
        },
      });
      
      await refreshMoodBoards();
    } catch (err) {
      console.error('Error updating mood board:', err);
      throw new Error(err instanceof Error ? err.message : 'Failed to update mood board');
    }
  };

  const deleteMoodBoard = async (id: string): Promise<void> => {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    try {
      const moodBoardRef = doc(db, 'moodBoards', id);
      
      // Get mood board details for logging before deletion
      const boardToDelete = moodBoards.find(board => board.id === id);
      
      await deleteDoc(moodBoardRef);
      
      // Log admin action
      await logAdminAction({
        action: 'mood_board_deleted',
        targetMoodBoardId: id,
        details: {
          title: boardToDelete?.title || 'Unknown',
          jlpt: boardToDelete?.jlpt || 'Unknown',
          kanjiCount: boardToDelete?.kanji?.length || 0,
        },
      });
      
      await refreshMoodBoards();
    } catch (err) {
      console.error('Error deleting mood board:', err);
      throw new Error(err instanceof Error ? err.message : 'Failed to delete mood board');
    }
  };

  const toggleMoodBoardStatus = async (id: string, isActive: boolean): Promise<void> => {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    try {
      const moodBoardRef = doc(db, 'moodBoards', id);
      await updateDoc(moodBoardRef, {
        isActive,
        updatedAt: Timestamp.now(),
      });
      
      // Log admin action
      const board = moodBoards.find(b => b.id === id);
      await logAdminAction({
        action: isActive ? 'mood_board_published' : 'mood_board_unpublished',
        targetMoodBoardId: id,
        details: {
          title: board?.title || 'Unknown',
          jlpt: board?.jlpt || 'Unknown',
          newStatus: isActive ? 'active' : 'inactive',
        },
      });
      
      await refreshMoodBoards();
    } catch (err) {
      console.error('Error toggling mood board status:', err);
      throw new Error(err instanceof Error ? err.message : 'Failed to toggle mood board status');
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const setupRealtimeListener = () => {
      if (!db) {
        // If no Firebase, just fetch JSON data
        fetchMoodBoards();
        return;
      }

      const moodBoardsRef = collection(db, 'moodBoards');
      const q = query(moodBoardsRef, orderBy('createdAt', 'desc'));

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          try {
            const fetchedMoodBoards: MoodBoard[] = snapshot.docs.map(doc => {
              const firebaseMoodBoard: FirebaseMoodBoard = {
                id: doc.id,
                ...doc.data()
              };
              return convertFirebaseMoodBoard(firebaseMoodBoard);
            });

            // Sort by sortOrder first, then by createdAt (in JavaScript to avoid composite index requirement)
            fetchedMoodBoards.sort((a, b) => {
              const aSortOrder = a.sortOrder || 0;
              const bSortOrder = b.sortOrder || 0;
              if (aSortOrder !== bSortOrder) {
                return aSortOrder - bSortOrder;
              }
              return b.createdAt.getTime() - a.createdAt.getTime();
            });

            setMoodBoards(fetchedMoodBoards);
            setLoading(false);
            setError(null);
          } catch (err) {
            console.error('Error processing mood board snapshot:', err);
            setError(err instanceof Error ? err.message : 'Failed to process mood boards');
            setLoading(false);
          }
        },
        (err) => {
          console.error('Error in mood boards snapshot listener:', err);
          setError(err.message || 'Failed to listen to mood board changes');
          setLoading(false);

          // Fallback to JSON data
          fetchMoodBoards();
        }
      );
    };

    setupRealtimeListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return {
    moodBoards,
    loading,
    error,
    refreshMoodBoards,
    createMoodBoard,
    updateMoodBoard,
    deleteMoodBoard,
    toggleMoodBoardStatus,
  };
}

// Utility function to search mood boards
export function searchMoodBoards(moodBoards: MoodBoard[], query: string): MoodBoard[] {
  if (!query.trim()) return moodBoards;

  const searchTerm = query.toLowerCase();
  return moodBoards.filter(board =>
    board.title.toLowerCase().includes(searchTerm) ||
    board.emoji.includes(searchTerm) ||
    board.description?.toLowerCase().includes(searchTerm) ||
    board.kanji.some(k =>
      k.char.includes(searchTerm) ||
      k.meaning?.toLowerCase().includes(searchTerm)
    )
  );
}

// Utility function to filter mood boards by JLPT level
export function filterMoodBoardsByJLPT(
  moodBoards: MoodBoard[],
  jlpt: 'all' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
): MoodBoard[] {
  if (jlpt === 'all') return moodBoards;
  return moodBoards.filter(board => board.jlpt === jlpt);
}
