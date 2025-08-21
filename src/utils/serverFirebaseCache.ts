// Server-side Firebase Storage Cache for TTS
// This file handles Firebase Storage operations on the server to avoid CORS issues

import admin from 'firebase-admin';
import crypto from 'crypto';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
    };

    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'doshi-sensei';
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      storageBucket: bucketName
    });

  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error);
  }
}

export class ServerFirebaseCache {
  private static instance: ServerFirebaseCache;
  private readonly CACHE_FOLDER = 'tts-cache';
  private readonly CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days
  private bucket: any;

  private constructor() {
    try {
      this.bucket = admin.storage().bucket();

    } catch (error) {
      console.error('❌ Failed to initialize storage bucket:', error);
    }
  }

  static getInstance(): ServerFirebaseCache {
    if (!ServerFirebaseCache.instance) {
      ServerFirebaseCache.instance = new ServerFirebaseCache();
    }
    return ServerFirebaseCache.instance;
  }

  /**
   * Generate a unique cache key for an article
   */
  private generateCacheKey(
    articleId: string,
    content: string,
    voice: string,
    provider: string
  ): string {
    const contentHash = this.generateContentHash(content);
    return `${articleId}_${contentHash}_${voice}_${provider}`;
  }

  /**
   * Generate a hash of the content
   */
  private generateContentHash(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
  }

  /**
   * Get the storage path for a cached audio file
   */
  private getStoragePath(cacheKey: string): string {
    return `${this.CACHE_FOLDER}/${cacheKey}.mp3`;
  }

  /**
   * Check if audio exists in cache and return URL if available
   */
  async getCachedAudioUrl(
    articleId: string,
    content: string,
    voice: string,
    provider: 'elevenlabs' | 'google'
  ): Promise<string | null> {
    try {
      const cacheKey = this.generateCacheKey(articleId, content, voice, provider);
      const storagePath = this.getStoragePath(cacheKey);
      const file = this.bucket.file(storagePath);

      const [exists] = await file.exists();
      if (!exists) {

        return null;
      }

      // Check if cache has expired
      const [metadata] = await file.getMetadata();
      const createdAt = new Date(metadata.timeCreated).getTime();
      if (Date.now() - createdAt > this.CACHE_DURATION) {

        await file.delete();
        return null;
      }

      // Generate a signed URL that expires in 1 hour
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000 // 1 hour
      });

      return url;
    } catch (error: any) {
      console.error('[Server Firebase Cache] Error checking cache:', error);
      return null;
    }
  }

  /**
   * Cache audio data in Firebase Storage
   */
  async cacheAudio(
    articleId: string,
    content: string,
    voice: string,
    provider: 'elevenlabs' | 'google',
    audioBuffer: Buffer
  ): Promise<string> {
    try {
      if (!this.bucket) {
        console.error('[Server Firebase Cache] Storage bucket not initialized');
        throw new Error('Storage bucket not initialized');
      }

      const cacheKey = this.generateCacheKey(articleId, content, voice, provider);
      const storagePath = this.getStoragePath(cacheKey);

      const file = this.bucket.file(storagePath);

      // Upload the audio file
      await file.save(audioBuffer, {
        metadata: {
          contentType: 'audio/mpeg',
          metadata: {
            articleId,
            voice,
            provider,
            contentHash: this.generateContentHash(content),
            createdAt: Date.now().toString()
          }
        }
      });

      // Generate a signed URL that expires in 1 hour
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000 // 1 hour
      });

      console.log(`[Server Firebase Cache] Cached audio for article ${articleId} (${this.formatBytes(audioBuffer.length)})`);
      return url;
    } catch (error: any) {
      console.error('[Server Firebase Cache] Error caching audio:', {
        error: error.message,
        code: error.code,
        details: error.details,
        stack: error.stack
      });
      
      // If it's a bucket error, provide more context
      if (error.code === 404 || error.message?.includes('bucket')) {
        console.error('[Server Firebase Cache] Bucket configuration issue. Please check:');
        console.error('1. The bucket name in Firebase console matches:', process.env.FIREBASE_STORAGE_BUCKET || 'doshi-sensei');
        console.error('2. The service account has Storage Admin permissions');
        console.error('3. Firebase Storage is enabled in your project');
      }
      
      throw error;
    }
  }

  /**
   * Delete cached audio for a specific article
   */
  async deleteCachedAudio(
    articleId: string,
    content: string,
    voice: string,
    provider: 'elevenlabs' | 'google'
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(articleId, content, voice, provider);
      const storagePath = this.getStoragePath(cacheKey);
      const file = this.bucket.file(storagePath);

      const [exists] = await file.exists();
      if (exists) {
        await file.delete();

      }
    } catch (error: any) {
      console.error('[Server Firebase Cache] Error deleting cache:', error);
    }
  }

  /**
   * Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default ServerFirebaseCache;