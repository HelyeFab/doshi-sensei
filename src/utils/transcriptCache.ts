import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  serverTimestamp,
  increment,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TranscriptLine } from '@/app/tools/youtube-shadowing/page';

interface CachedTranscript {
  id: string;
  contentId: string; // Hash of the content identifier
  contentType: 'youtube' | 'audio' | 'video';
  videoUrl?: string;
  videoTitle?: string;
  transcript: TranscriptLine[];
  language: string;
  duration?: number;
  createdAt: Timestamp;
  lastAccessed: Timestamp;
  accessCount: number;
  createdBy?: string; // User ID who created it
  metadata?: {
    youtubeVideoId?: string;
    channelName?: string;
    uploadDate?: string;
  };
}

export class TranscriptCacheManager {
  private static COLLECTION_NAME = 'transcriptCache';
  private static CACHE_DURATION_DAYS = 90; // Cache for 90 days

  /**
   * Generate a unique content ID for caching
   * For YouTube: Use video ID
   * For uploaded files: Use hash of file name + size + duration
   */
  static generateContentId(params: {
    type: 'youtube' | 'audio' | 'video';
    videoUrl?: string;
    fileName?: string;
    fileSize?: number;
    duration?: number;
  }): string {
    if (params.type === 'youtube' && params.videoUrl) {
      // Extract YouTube video ID
      const videoId = this.extractYouTubeVideoId(params.videoUrl);
      if (videoId) {
        return `youtube_${videoId}`;
      }
    }

    // For uploaded files, create a simple hash using browser-compatible method
    const contentString = `${params.type}_${params.fileName}_${params.fileSize}_${params.duration}`;
    
    // Simple hash function for browser
    let hash = 0;
    for (let i = 0; i < contentString.length; i++) {
      const char = contentString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `file_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Extract YouTube video ID from URL
   */
  private static extractYouTubeVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/,
      /youtube\.com\/v\/([^&\s]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  /**
   * Get cached transcript from Firestore
   */
  static async getCachedTranscript(contentId: string): Promise<CachedTranscript | null> {
    try {
      console.log('Checking transcript cache for:', contentId);
      
      const docRef = doc(db, this.COLLECTION_NAME, contentId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        console.log('No cached transcript found');
        return null;
      }

      const data = docSnap.data() as CachedTranscript;
      
      // Check if cache is expired
      const createdAt = data.createdAt?.toDate();
      if (createdAt) {
        const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (ageInDays > this.CACHE_DURATION_DAYS) {
          console.log('Cached transcript expired');
          return null;
        }
      }

      // Update access count and last accessed time
      await updateDoc(docRef, {
        lastAccessed: serverTimestamp(),
        accessCount: increment(1)
      });

      console.log('Found cached transcript, access count:', data.accessCount + 1);
      return data;
    } catch (error) {
      console.error('Error getting cached transcript:', error);
      return null;
    }
  }

  /**
   * Save transcript to Firestore cache
   */
  static async saveTranscriptToCache(params: {
    contentId: string;
    contentType: 'youtube' | 'audio' | 'video';
    videoUrl?: string;
    videoTitle?: string;
    transcript: TranscriptLine[];
    language: string;
    duration?: number;
    userId?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      console.log('Saving transcript to cache:', params.contentId);

      const cacheData = {
        id: params.contentId,
        contentId: params.contentId,
        contentType: params.contentType,
        videoUrl: params.videoUrl,
        videoTitle: params.videoTitle,
        transcript: params.transcript,
        language: params.language,
        duration: params.duration,
        createdAt: serverTimestamp(),
        lastAccessed: serverTimestamp(),
        accessCount: 1,
        createdBy: params.userId,
        metadata: params.metadata
      };

      const docRef = doc(db, this.COLLECTION_NAME, params.contentId);
      await setDoc(docRef, cacheData);

      console.log('Transcript saved to cache successfully');
      console.log('Saved document ID:', params.contentId);
      console.log('Content type:', params.contentType);
      console.log('Video title:', params.videoTitle);
    } catch (error) {
      console.error('Error saving transcript to cache:', error);
      // Don't throw - caching failure shouldn't break the transcription flow
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    totalCached: number;
    totalAccessCount: number;
    popularVideos: Array<{ title: string; accessCount: number }>;
  }> {
    // This would require a more complex query
    // For now, return a placeholder
    return {
      totalCached: 0,
      totalAccessCount: 0,
      popularVideos: []
    };
  }
}