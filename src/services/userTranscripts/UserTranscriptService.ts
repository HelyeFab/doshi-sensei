import { db, auth } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { TranscriptSegment } from '@/types/transcript';

export interface UserEdit {
  originalText: string;
  editedText: string;
  editedAt: Timestamp;
  confidence?: number; // 0-1, how confident we are in this edit
}

export interface UserTranscript {
  videoId: string;
  userId: string;
  videoTitle?: string;
  videoUrl?: string;
  originalTranscript: TranscriptSegment[];
  userEdits: {
    [segmentId: string]: UserEdit;
  };
  lastModified: Timestamp;
  createdAt: Timestamp;
  metadata?: {
    youtubeVideoId?: string;
    channelName?: string;
    duration?: number;
    thumbnailUrl?: string;
    isMusic?: boolean;
    lyricsValidated?: boolean;
  };
}

export interface TranscriptWithConfidence extends TranscriptSegment {
  confidence: number; // 0-1
  isUserEdited?: boolean;
  validationSource?: 'lyrics_api' | 'community' | 'ai' | 'original';
}

class UserTranscriptService {
  private readonly COLLECTION_NAME = 'userTranscripts';

  /**
   * Get a user's edited transcript for a video
   */
  async getUserTranscript(videoId: string): Promise<UserTranscript | null> {
    const user = auth.currentUser;
    if (!user) return null;

    try {
      const docRef = doc(db, this.COLLECTION_NAME, `${user.uid}_${videoId}`);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as UserTranscript;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user transcript:', error);
      return null;
    }
  }

  /**
   * Save or update a user's transcript edits
   */
  async saveUserTranscript(
    videoId: string,
    originalTranscript: TranscriptSegment[],
    userEdits: { [segmentId: string]: UserEdit },
    metadata?: UserTranscript['metadata']
  ): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be authenticated to save transcripts');

    const docId = `${user.uid}_${videoId}`;
    const docRef = doc(db, this.COLLECTION_NAME, docId);

    const transcript: UserTranscript = {
      videoId,
      userId: user.uid,
      originalTranscript,
      userEdits,
      lastModified: serverTimestamp() as Timestamp,
      createdAt: serverTimestamp() as Timestamp,
      metadata,
    };

    try {
      const existingDoc = await getDoc(docRef);
      if (existingDoc.exists()) {
        // Update existing document
        await updateDoc(docRef, {
          userEdits,
          lastModified: serverTimestamp(),
          metadata,
        });
      } else {
        // Create new document
        await setDoc(docRef, transcript);
      }
    } catch (error) {
      console.error('Error saving user transcript:', error);
      throw error;
    }
  }

  /**
   * Update a single segment edit
   */
  async updateSegmentEdit(
    videoId: string,
    segmentId: string,
    originalText: string,
    editedText: string,
    confidence?: number
  ): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be authenticated to edit transcripts');

    const docId = `${user.uid}_${videoId}`;
    const docRef = doc(db, this.COLLECTION_NAME, docId);

    const edit: UserEdit = {
      originalText,
      editedText,
      editedAt: serverTimestamp() as Timestamp,
      confidence,
    };

    try {
      await updateDoc(docRef, {
        [`userEdits.${segmentId}`]: edit,
        lastModified: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating segment edit:', error);
      throw error;
    }
  }

  /**
   * Merge user edits with original transcript
   */
  mergeTranscriptWithEdits(
    originalTranscript: TranscriptSegment[],
    userEdits: { [segmentId: string]: UserEdit }
  ): TranscriptWithConfidence[] {
    return originalTranscript.map((segment, index) => {
      const segmentId = `segment_${index}`;
      const userEdit = userEdits[segmentId];

      if (userEdit) {
        return {
          ...segment,
          text: userEdit.editedText,
          confidence: userEdit.confidence || 1,
          isUserEdited: true,
          validationSource: 'community' as const,
        };
      }

      return {
        ...segment,
        confidence: segment.confidence || 0.8, // Default confidence
        isUserEdited: false,
        validationSource: 'original' as const,
      };
    });
  }

  /**
   * Delete a user's transcript edits
   */
  async deleteUserTranscript(videoId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;

    const docId = `${user.uid}_${videoId}`;
    const docRef = doc(db, this.COLLECTION_NAME, docId);

    try {
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting user transcript:', error);
      throw error;
    }
  }

  /**
   * Calculate confidence score for a transcript segment
   * This can be enhanced with various validation methods
   */
  calculateConfidence(
    segment: TranscriptSegment,
    validationData?: {
      lyricsMatch?: boolean;
      communityVerified?: boolean;
      aiValidated?: boolean;
    }
  ): number {
    let confidence = 0.7; // Base confidence from SupaData

    if (validationData?.lyricsMatch) {
      confidence = Math.min(confidence + 0.2, 1);
    }
    if (validationData?.communityVerified) {
      confidence = Math.min(confidence + 0.1, 1);
    }
    if (validationData?.aiValidated) {
      confidence = Math.min(confidence + 0.1, 1);
    }

    // Reduce confidence for very short segments (might be misheard)
    if (segment.text.length < 3) {
      confidence *= 0.8;
    }

    return confidence;
  }

  /**
   * Check if user has edit permissions (premium feature)
   */
  async canEditTranscripts(): Promise<boolean> {
    const user = auth.currentUser;
    if (!user) return false;

    // This will be integrated with your subscription system
    // For now, we'll check if user is authenticated
    // TODO: Check premium status
    return true;
  }
}

export const userTranscriptService = new UserTranscriptService();