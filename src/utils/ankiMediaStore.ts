/**
 * Local media storage for Anki cards
 * Stores media blobs in IndexedDB for offline access
 */

import { DatabaseManager } from './indexedDB';

interface StoredMedia {
  id: string;          // filename
  blob: Blob;          // actual media data
  type: string;        // MIME type
  size: number;        // file size
  createdAt: Date;
}

export class AnkiMediaStore {
  private static instance: AnkiMediaStore;
  private dbManager: DatabaseManager;
  private blobUrlCache: Map<string, string> = new Map();
  
  private constructor() {
    this.dbManager = new DatabaseManager();
  }
  
  static getInstance(): AnkiMediaStore {
    if (!this.instance) {
      this.instance = new AnkiMediaStore();
    }
    return this.instance;
  }
  
  /**
   * Store media blob in IndexedDB
   * NOTE: Anki media storage is temporarily disabled per documentation
   */
  async storeMedia(filename: string, blob: Blob): Promise<string> {
    try {
      // TODO: Implement proper media storage when re-enabled
      // For now, just return object URL without persisting

      // Create and cache blob URL
      const blobUrl = URL.createObjectURL(blob);
      this.blobUrlCache.set(filename, blobUrl);
      
      return blobUrl;
    } catch (error) {
      console.error('Failed to create blob URL:', error);
      throw error;
    }
  }
  
  /**
   * Retrieve media blob URL
   */
  async getMediaUrl(filename: string): Promise<string | null> {
    // Check cache first
    if (this.blobUrlCache.has(filename)) {
      return this.blobUrlCache.get(filename)!;
    }
    
    // TODO: Implement retrieval when storage is re-enabled

    return null;
  }
  
  /**
   * Store multiple media files
   */
  async storeMediaBatch(mediaMap: Map<string, Blob>): Promise<Map<string, string>> {
    const urls = new Map<string, string>();
    
    for (const [filename, blob] of mediaMap) {
      const url = await this.storeMedia(filename, blob);
      urls.set(filename, url);
    }
    
    return urls;
  }
  
  /**
   * Clean up blob URLs when no longer needed
   */
  cleanup() {
    for (const url of this.blobUrlCache.values()) {
      URL.revokeObjectURL(url);
    }
    this.blobUrlCache.clear();
  }
  
  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    fileTypes: Map<string, number>;
  }> {
    // Only return cache stats for now
    console.warn('Anki media stats are limited to cache only (storage temporarily disabled)');
    return {
      totalFiles: this.blobUrlCache.size,
      totalSize: 0, // Can't determine size from blob URLs
      fileTypes: new Map()
    };
  }
  
  /**
   * Delete media files by filename
   */
  async deleteMedia(filenames: string[]): Promise<void> {
    try {
      for (const filename of filenames) {
        // Remove from cache
        const cachedUrl = this.blobUrlCache.get(filename);
        if (cachedUrl) {
          URL.revokeObjectURL(cachedUrl);
          this.blobUrlCache.delete(filename);
        }
      }
      
      // TODO: Remove from storage when re-enabled
      console.warn('Anki media deletion is limited to cache only (storage temporarily disabled)');

    } catch (error) {
      console.error('Failed to delete media:', error);
    }
  }
  
  /**
   * Delete all media files (use with caution)
   */
  async deleteAllMedia(): Promise<void> {
    try {
      // Revoke all cached URLs
      this.cleanup();
      
      // TODO: Clear from storage when re-enabled
      console.warn('Anki media clearing is limited to cache only (storage temporarily disabled)');

    } catch (error) {
      console.error('Failed to delete all media:', error);
    }
  }
}