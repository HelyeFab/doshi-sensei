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
   */
  async storeMedia(filename: string, blob: Blob): Promise<string> {
    try {
      // Store in IndexedDB
      const media: StoredMedia = {
        id: filename,
        blob: blob,
        type: blob.type,
        size: blob.size,
        createdAt: new Date()
      };
      
      await this.dbManager.put('ankiMedia', media);
      
      // Create and cache blob URL
      const blobUrl = URL.createObjectURL(blob);
      this.blobUrlCache.set(filename, blobUrl);
      
      return blobUrl;
    } catch (error) {
      console.error('Failed to store media:', error);
      // Return object URL even if storage fails
      return URL.createObjectURL(blob);
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
    
    try {
      // Load from IndexedDB
      const media = await this.dbManager.get('ankiMedia', filename);
      if (media && media.blob) {
        const blobUrl = URL.createObjectURL(media.blob);
        this.blobUrlCache.set(filename, blobUrl);
        return blobUrl;
      }
    } catch (error) {
      console.error('Failed to retrieve media:', error);
    }
    
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
    try {
      const allMedia = await this.dbManager.getAll('ankiMedia');
      
      const stats = {
        totalFiles: allMedia.length,
        totalSize: 0,
        fileTypes: new Map<string, number>()
      };
      
      for (const media of allMedia) {
        stats.totalSize += media.size;
        
        const type = media.type.split('/')[0] || 'unknown';
        stats.fileTypes.set(type, (stats.fileTypes.get(type) || 0) + 1);
      }
      
      return stats;
    } catch (error) {
      console.error('Failed to get media stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        fileTypes: new Map()
      };
    }
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
        
        // Remove from IndexedDB
        await this.dbManager.delete('ankiMedia', filename);
      }
      
      console.log(`Deleted ${filenames.length} media files from storage`);
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
      
      // Clear IndexedDB store
      await this.dbManager.clear('ankiMedia');
      
      console.log('Deleted all media files from storage');
    } catch (error) {
      console.error('Failed to delete all media:', error);
    }
  }
}