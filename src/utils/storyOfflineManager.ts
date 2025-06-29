import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Story } from '@/types/story';

interface StoryDBSchema extends DBSchema {
  stories: {
    key: string;
    value: {
      story: Story;
      cachedAt: string;
      expiresAt: string;
    };
  };
  readProgress: {
    key: string; // userId_storyId
    value: {
      storyId: string;
      userId: string;
      currentPage: number;
      completed: boolean;
      lastReadAt: string;
      savedWords: string[];
    };
  };
}

class StoryOfflineManager {
  private db: IDBPDatabase<StoryDBSchema> | null = null;
  private readonly DB_NAME = 'doshi-sensei-stories';
  private readonly DB_VERSION = 1;
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

  async initDB(): Promise<void> {
    if (this.db) return;

    try {
      this.db = await openDB<StoryDBSchema>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          // Create stories store
          if (!db.objectStoreNames.contains('stories')) {
            db.createObjectStore('stories', { keyPath: 'story.id' });
          }
          
          // Create read progress store
          if (!db.objectStoreNames.contains('readProgress')) {
            db.createObjectStore('readProgress', { keyPath: 'storyId' });
          }
        },
      });
    } catch (error) {
      console.error('Failed to initialize Story IndexedDB:', error);
      throw error;
    }
  }

  // Cache a story for offline reading
  async cacheStory(story: Story): Promise<void> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.CACHE_DURATION);

      await this.db.put('stories', {
        story,
        cachedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString()
      });

      // Pre-cache images for offline viewing
      await this.cacheStoryImages(story);
    } catch (error) {
      console.error('Failed to cache story:', error);
      throw error;
    }
  }

  // Get a cached story
  async getCachedStory(storyId: string): Promise<Story | null> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    try {
      const cached = await this.db.get('stories', storyId);
      
      if (!cached) return null;

      // Check if cache has expired
      const now = new Date();
      const expiresAt = new Date(cached.expiresAt);
      
      if (now > expiresAt) {
        // Cache has expired, remove it
        await this.removeCachedStory(storyId);
        return null;
      }

      return cached.story;
    } catch (error) {
      console.error('Failed to get cached story:', error);
      return null;
    }
  }

  // Get all cached stories
  async getAllCachedStories(): Promise<Story[]> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    try {
      const allCached = await this.db.getAll('stories');
      const now = new Date();

      // Filter out expired stories
      const validStories = allCached.filter(cached => {
        const expiresAt = new Date(cached.expiresAt);
        return now <= expiresAt;
      });

      return validStories.map(cached => cached.story);
    } catch (error) {
      console.error('Failed to get all cached stories:', error);
      return [];
    }
  }

  // Remove a cached story
  async removeCachedStory(storyId: string): Promise<void> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.delete('stories', storyId);
    } catch (error) {
      console.error('Failed to remove cached story:', error);
    }
  }

  // Save reading progress locally
  async saveLocalProgress(
    userId: string,
    storyId: string,
    currentPage: number,
    completed: boolean,
    savedWords: string[]
  ): Promise<void> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    try {
      const key = `${userId}_${storyId}`;
      await this.db.put('readProgress', {
        storyId,
        userId,
        currentPage,
        completed,
        lastReadAt: new Date().toISOString(),
        savedWords
      });
    } catch (error) {
      console.error('Failed to save local progress:', error);
    }
  }

  // Get local reading progress
  async getLocalProgress(userId: string, storyId: string): Promise<any | null> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    try {
      const key = `${userId}_${storyId}`;
      return await this.db.get('readProgress', key);
    } catch (error) {
      console.error('Failed to get local progress:', error);
      return null;
    }
  }

  // Pre-cache story images for offline viewing
  private async cacheStoryImages(story: Story): Promise<void> {
    if ('caches' in window) {
      try {
        const cache = await caches.open('story-images');
        
        // Cache cover image
        if (story.coverImageUrl) {
          await cache.add(story.coverImageUrl).catch(() => {
            console.warn('Failed to cache cover image:', story.coverImageUrl);
          });
        }

        // Cache page images
        for (const page of story.pages) {
          if (page.imageUrl) {
            await cache.add(page.imageUrl).catch(() => {
              console.warn('Failed to cache page image:', page.imageUrl);
            });
          }
        }
      } catch (error) {
        console.error('Failed to cache story images:', error);
      }
    }
  }

  // Check if a story is cached
  async isStoryCached(storyId: string): Promise<boolean> {
    const cached = await this.getCachedStory(storyId);
    return cached !== null;
  }

  // Clear all cached stories
  async clearAllCache(): Promise<void> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    try {
      const tx = this.db.transaction(['stories', 'readProgress'], 'readwrite');
      await tx.objectStore('stories').clear();
      await tx.objectStore('readProgress').clear();
      await tx.done;

      // Clear image cache
      if ('caches' in window) {
        await caches.delete('story-images');
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  }

  // Get cache size (approximate)
  async getCacheSize(): Promise<number> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stories = await this.db.getAll('stories');
      let totalSize = 0;

      stories.forEach(cached => {
        // Rough estimation of story size
        totalSize += JSON.stringify(cached).length;
      });

      return totalSize;
    } catch (error) {
      console.error('Failed to get cache size:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const storyOfflineManager = new StoryOfflineManager();