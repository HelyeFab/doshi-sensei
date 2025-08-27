/**
 * Magic Link Authentication System
 * Secure passwordless authentication using email links
 */

import { 
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  ActionCodeSettings,
  User
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { MagicLinkData } from './types';
import { AUTH_CONFIG, AUTH_ERRORS, SECURITY_MESSAGES } from './constants';
import { enforceRateLimit } from './rate-limiter';
import { getSecurityMonitor } from './security-monitor';
import crypto from 'crypto';

export class MagicLinkService {
  private static instance: MagicLinkService | null = null;
  
  private constructor() {}
  
  static getInstance(): MagicLinkService {
    if (!MagicLinkService.instance) {
      MagicLinkService.instance = new MagicLinkService();
    }
    return MagicLinkService.instance;
  }

  /**
   * Send magic link to user's email
   */
  async sendMagicLink(
    email: string,
    metadata: {
      ipAddress?: string;
      userAgent?: string;
      returnUrl?: string;
    } = {}
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Check rate limiting
      await enforceRateLimit(email, 'magicLink');
      
      // Validate email format
      if (!this.isValidEmail(email)) {
        throw new Error('Invalid email address');
      }
      
      // Generate secure token
      const token = this.generateSecureToken();
      
      // Store magic link data
      await this.storeMagicLinkData(email, token, metadata);
      
      // Configure action code settings
      // Firebase will redirect to /auth/action with its own parameters
      const actionCodeSettings: ActionCodeSettings = {
        url: `${this.getBaseUrl()}`,
        handleCodeInApp: true,
      };
      
      // Send the magic link
      if (auth) {
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      }
      
      // Log security event
      const monitor = getSecurityMonitor();
      await monitor.logEvent(email, 'magic_link_sent', {
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });
      
      // Store email in localStorage for verification
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('magicLinkEmail', email);
      }
      
      return {
        success: true,
        message: SECURITY_MESSAGES.MAGIC_LINK_SENT,
      };
    } catch (error: any) {
      console.error('Failed to send magic link:', error);
      
      if (error.code === AUTH_ERRORS.TOO_MANY_ATTEMPTS) {
        return {
          success: false,
          message: SECURITY_MESSAGES.RATE_LIMITED,
        };
      }
      
      return {
        success: false,
        message: 'Failed to send magic link. Please try again.',
      };
    }
  }

  /**
   * Verify and complete magic link sign-in
   */
  async verifyMagicLink(
    email: string,
    token: string,
    link?: string
  ): Promise<{ success: boolean; user?: User; message?: string }> {
    try {
      // Validate magic link data
      const isValid = await this.validateMagicLinkData(email, token);
      if (!isValid) {
        throw new Error(AUTH_ERRORS.INVALID_MAGIC_LINK);
      }
      
      // Sign in with Firebase magic link
      if (!auth) {
        throw new Error('Authentication not initialized');
      }
      
      // Use the full link if provided, otherwise check if current URL is a sign-in link
      const signInLink = link || window.location.href;
      
      if (!isSignInWithEmailLink(auth, signInLink)) {
        throw new Error(AUTH_ERRORS.INVALID_MAGIC_LINK);
      }
      
      // Complete sign-in
      const result = await signInWithEmailLink(auth, email, signInLink);
      
      // Mark magic link as used
      await this.markMagicLinkUsed(email, token);
      
      // Log security event
      const monitor = getSecurityMonitor();
      await monitor.logEvent(result.user.uid, 'magic_link_used', {
        email,
        success: true,
      });
      
      // Clear stored email
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('magicLinkEmail');
      }
      
      return {
        success: true,
        user: result.user,
      };
    } catch (error: any) {
      console.error('Failed to verify magic link:', error);
      
      // Log failed attempt
      const monitor = getSecurityMonitor();
      await monitor.logEvent(email, 'magic_link_used', {
        email,
        success: false,
        error: error.message,
      });
      
      let message = 'Invalid or expired magic link';
      if (error.message === AUTH_ERRORS.EXPIRED_MAGIC_LINK) {
        message = 'This magic link has expired. Please request a new one.';
      }
      
      return {
        success: false,
        message,
      };
    }
  }

  /**
   * Store magic link data in Firestore
   */
  private async storeMagicLinkData(
    email: string,
    token: string,
    metadata: any
  ): Promise<void> {
    if (!db) return;
    
    const data: MagicLinkData = {
      email,
      token,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + AUTH_CONFIG.MAGIC_LINK_EXPIRY),
      used: false,
      ipAddress: metadata.ipAddress || 'unknown',
      userAgent: metadata.userAgent || 'unknown',
    };
    
    const docRef = doc(db, 'magic_links', `${email}_${token}`);
    await setDoc(docRef, {
      ...data,
      createdAt: serverTimestamp(),
      expiresAt: serverTimestamp(),
    });
  }

  /**
   * Validate magic link data
   */
  private async validateMagicLinkData(
    email: string,
    token: string
  ): Promise<boolean> {
    if (!db) return false;
    
    try {
      const docRef = doc(db, 'magic_links', `${email}_${token}`);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return false;
      }
      
      const data = docSnap.data() as MagicLinkData;
      
      // Check if already used
      if (data.used) {
        return false;
      }
      
      // Check expiration
      const expiresAt = data.expiresAt instanceof Date 
        ? data.expiresAt 
        : (data.expiresAt as any).toDate();
        
      if (expiresAt < new Date()) {
        throw new Error(AUTH_ERRORS.EXPIRED_MAGIC_LINK);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to validate magic link:', error);
      return false;
    }
  }

  /**
   * Mark magic link as used
   */
  private async markMagicLinkUsed(
    email: string,
    token: string
  ): Promise<void> {
    if (!db) return;
    
    try {
      const docRef = doc(db, 'magic_links', `${email}_${token}`);
      await setDoc(docRef, {
        used: true,
        usedAt: serverTimestamp(),
      }, { merge: true });
      
      // Schedule deletion after 24 hours
      setTimeout(() => {
        this.deleteMagicLinkData(email, token);
      }, 24 * 60 * 60 * 1000);
    } catch (error) {
      console.error('Failed to mark magic link as used:', error);
    }
  }

  /**
   * Delete magic link data
   */
  private async deleteMagicLinkData(
    email: string,
    token: string
  ): Promise<void> {
    if (!db) return;
    
    try {
      const docRef = doc(db, 'magic_links', `${email}_${token}`);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Failed to delete magic link data:', error);
    }
  }

  /**
   * Generate secure token
   */
  private generateSecureToken(): string {
    if (typeof window !== 'undefined' && window.crypto) {
      // Browser environment
      const array = new Uint8Array(32);
      window.crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    } else {
      // Node.js environment (for SSR)
      return crypto.randomBytes(32).toString('hex');
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get base URL for magic links
   */
  private getBaseUrl(): string {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    
    // Fallback for SSR
    const env = process.env.NODE_ENV;
    if (env === 'production') {
      return 'https://doshisensei.com';
    }
    return 'http://localhost:3000';
  }

  /**
   * Clean up expired magic links (maintenance task)
   */
  async cleanupExpiredLinks(): Promise<void> {
    if (!db) return;
    
    try {
      // This would typically be done via a scheduled cloud function
      console.log('Cleanup of expired magic links should be handled by a scheduled function');
    } catch (error) {
      console.error('Failed to cleanup expired links:', error);
    }
  }
}

// Export singleton instance getter
export const getMagicLinkService = () => MagicLinkService.getInstance();