import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface ArticleDBSchema extends DBSchema {
  articles: {
    key: string;
    value: {
      id: string;
      title: string;
      content: string;
      slug: string;
      author?: string;
      publishedAt?: number;
      readingTime?: number;
      images?: string[];
      audioUrl?: string;
      tags?: string[];
      version?: string;
      cachedAt: number;
      lastAccessed: number;
      size: number;
    };
    indexes: {
      'by-slug': string;
      'by-cached-at': number;
      'by-last-accessed': number;
    };
  };
  articleAssets: {
    key: string;
    value: {
      articleId: string;
      assetUrl: string;
      blob: Blob;
      type: 'image' | 'audio';
      cachedAt: number;
    };
    indexes: {
      'by-article': string;
      'by-type': string;
    };
  };
}

export class ArticleIndexedDB {
  private static DB_NAME = 'doshi-sensei-articles';
  private static DB_VERSION = 1;
  private static db: IDBPDatabase<ArticleDBSchema> | null = null;

  static async initialize(): Promise<void> {
    if (this.db) return;

    try {
      this.db = await openDB<ArticleDBSchema>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db, oldVersion, newVersion, transaction) {
          // Create articles store
          if (!db.objectStoreNames.contains('articles')) {
            const articleStore = db.createObjectStore('articles', { keyPath: 'id' });
            articleStore.createIndex('by-slug', 'slug');
            articleStore.createIndex('by-cached-at', 'cachedAt');
            articleStore.createIndex('by-last-accessed', 'lastAccessed');
          }

          // Create article assets store
          if (!db.objectStoreNames.contains('articleAssets')) {
            const assetStore = db.createObjectStore('articleAssets', { 
              keyPath: 'assetUrl' 
            });
            assetStore.createIndex('by-article', 'articleId');
            assetStore.createIndex('by-type', 'type');
          }
        }
      });

      console.log('[ArticleIndexedDB] Database initialized successfully');
    } catch (error) {
      console.error('[ArticleIndexedDB] Failed to initialize database:', error);
      throw error;
    }
  }

  static async getDB(): Promise<IDBPDatabase<ArticleDBSchema>> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) {
      throw new Error('Failed to initialize article database');
    }
    return this.db;
  }

  static async saveArticle(article: any): Promise<void> {
    const db = await this.getDB();
    await db.put('articles', {
      ...article,
      cachedAt: article.cachedAt || Date.now(),
      lastAccessed: Date.now()
    });
  }

  static async getArticle(id: string): Promise<any | null> {
    const db = await this.getDB();
    const article = await db.get('articles', id);
    
    if (article) {
      // Update last accessed time
      await db.put('articles', {
        ...article,
        lastAccessed: Date.now()
      });
    }
    
    return article;
  }

  static async getArticleBySlug(slug: string): Promise<any | null> {
    const db = await this.getDB();
    const index = db.transaction('articles').store.index('by-slug');
    const article = await index.get(slug);
    
    if (article) {
      // Update last accessed time
      await this.saveArticle({
        ...article,
        lastAccessed: Date.now()
      });
    }
    
    return article;
  }

  static async getAllArticles(): Promise<any[]> {
    const db = await this.getDB();
    return db.getAll('articles');
  }

  static async deleteArticle(id: string): Promise<void> {
    const db = await this.getDB();
    
    // Delete article
    await db.delete('articles', id);
    
    // Delete associated assets
    const tx = db.transaction('articleAssets', 'readwrite');
    const index = tx.store.index('by-article');
    const assets = await index.getAllKeys(id);
    
    for (const assetUrl of assets) {
      await tx.store.delete(assetUrl);
    }
    
    await tx.done;
  }

  static async saveAsset(articleId: string, assetUrl: string, blob: Blob, type: 'image' | 'audio'): Promise<void> {
    const db = await this.getDB();
    await db.put('articleAssets', {
      articleId,
      assetUrl,
      blob,
      type,
      cachedAt: Date.now()
    });
  }

  static async getAsset(assetUrl: string): Promise<Blob | null> {
    const db = await this.getDB();
    const asset = await db.get('articleAssets', assetUrl);
    return asset?.blob || null;
  }

  static async getArticleAssets(articleId: string): Promise<{ images: Map<string, Blob>; audio: Map<string, Blob> }> {
    const db = await this.getDB();
    const index = db.transaction('articleAssets').store.index('by-article');
    const assets = await index.getAll(articleId);
    
    const images = new Map<string, Blob>();
    const audio = new Map<string, Blob>();
    
    for (const asset of assets) {
      if (asset.type === 'image') {
        images.set(asset.assetUrl, asset.blob);
      } else if (asset.type === 'audio') {
        audio.set(asset.assetUrl, asset.blob);
      }
    }
    
    return { images, audio };
  }

  static async getOldestArticles(limit: number): Promise<any[]> {
    const db = await this.getDB();
    const tx = db.transaction('articles', 'readonly');
    const index = tx.store.index('by-last-accessed');
    
    const articles: any[] = [];
    let cursor = await index.openCursor();
    
    while (cursor && articles.length < limit) {
      articles.push(cursor.value);
      cursor = await cursor.continue();
    }
    
    return articles;
  }

  static async getStorageSize(): Promise<{ count: number; sizeBytes: number }> {
    const db = await this.getDB();
    const articles = await db.getAll('articles');
    
    let totalSize = 0;
    for (const article of articles) {
      totalSize += article.size || 0;
    }
    
    return {
      count: articles.length,
      sizeBytes: totalSize
    };
  }

  static async clearAll(): Promise<void> {
    const db = await this.getDB();
    await db.clear('articles');
    await db.clear('articleAssets');
  }
}