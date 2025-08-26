/**
 * Email Verification Service
 * Handles email verification with secure tokens
 */

import { 
  sendEmailVerification,
  applyActionCode,
  User 
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { AUTH_CONFIG, SECURITY_MESSAGES } from './constants';
import { getSecurityMonitor } from './security-monitor';

export class EmailVerificationService {
  private static instance: EmailVerificationService | null = null;
  
  private constructor() {}
  
  static getInstance(): EmailVerificationService {
    if (!EmailVerificationService.instance) {
      EmailVerificationService.instance = new EmailVerificationService();
    }
    return EmailVerificationService.instance;
  }

  /**
   * Send verification email to user
   */
  async sendVerificationEmail(
    user: User,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!user) {
        throw new Error('No user provided');
      }
      
      if (user.emailVerified) {
        return {
          success: false,
          message: 'Email is already verified',
        };
      }
      
      // Send verification email
      await sendEmailVerification(user, {
        url: `${this.getBaseUrl()}/auth/email-verified`,
        handleCodeInApp: true,
      });
      
      // Track verification request
      await this.trackVerificationRequest(user.uid, user.email!, metadata);
      
      // Log security event
      const monitor = getSecurityMonitor();
      await monitor.logEvent(user.uid, 'verification_email_sent', {
        email: user.email,
        ...metadata,
      });
      
      return {
        success: true,
        message: SECURITY_MESSAGES.VERIFICATION_REQUIRED,
      };
    } catch (error: any) {
      console.error('Failed to send verification email:', error);
      
      // Check for specific errors
      if (error.code === 'auth/too-many-requests') {
        return {
          success: false,
          message: 'Too many requests. Please try again later.',
        };
      }
      
      return {
        success: false,
        message: 'Failed to send verification email. Please try again.',
      };
    }
  }

  /**
   * Verify email with action code
   */
  async verifyEmailWithCode(
    code: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!auth) {
        throw new Error('Authentication not initialized');
      }
      
      // Apply the verification code
      await applyActionCode(auth, code);
      
      // Get current user
      const user = auth.currentUser;
      if (user) {
        // Reload user to get updated emailVerified status
        await user.reload();
        
        // Update user document
        await this.updateUserVerificationStatus(user.uid, true);
        
        // Log security event
        const monitor = getSecurityMonitor();
        await monitor.logEvent(user.uid, 'email_verified', {
          email: user.email,
        });
      }
      
      return {
        success: true,
        message: 'Email verified successfully',
      };
    } catch (error: any) {
      console.error('Failed to verify email:', error);
      
      let message = 'Failed to verify email';
      if (error.code === 'auth/invalid-action-code') {
        message = 'Invalid or expired verification code';
      } else if (error.code === 'auth/expired-action-code') {
        message = 'Verification code has expired. Please request a new one.';
      }
      
      return {
        success: false,
        message,
      };
    }
  }

  /**
   * Check if user needs email verification
   */
  async checkVerificationStatus(
    user: User
  ): Promise<{
    verified: boolean;
    reminderNeeded: boolean;
    daysSinceRequest?: number;
  }> {
    if (!user || !db) {
      return { verified: false, reminderNeeded: false };
    }
    
    // Check Firebase auth status
    const verified = user.emailVerified;
    
    if (verified) {
      return { verified: true, reminderNeeded: false };
    }
    
    // Check when verification was last requested
    try {
      const verificationRef = doc(db, 'email_verifications', user.uid);
      const verificationDoc = await getDoc(verificationRef);
      
      if (!verificationDoc.exists()) {
        return { verified: false, reminderNeeded: true };
      }
      
      const data = verificationDoc.data();
      const lastRequested = data.lastRequested?.toDate() || new Date();
      const daysSince = Math.floor(
        (Date.now() - lastRequested.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      return {
        verified: false,
        reminderNeeded: daysSince >= 3, // Remind after 3 days
        daysSinceRequest: daysSince,
      };
    } catch (error) {
      console.error('Failed to check verification status:', error);
      return { verified: false, reminderNeeded: false };
    }
  }

  /**
   * Track verification request
   */
  private async trackVerificationRequest(
    userId: string,
    email: string,
    metadata?: any
  ): Promise<void> {
    if (!db) return;
    
    try {
      const verificationRef = doc(db, 'email_verifications', userId);
      await setDoc(verificationRef, {
        userId,
        email,
        lastRequested: serverTimestamp(),
        requestCount: 1, // Will be incremented on subsequent requests
        metadata,
      }, { merge: true });
      
      // Increment request count if document exists
      const doc = await getDoc(verificationRef);
      if (doc.exists()) {
        const currentCount = doc.data().requestCount || 0;
        await updateDoc(verificationRef, {
          requestCount: currentCount + 1,
        });
      }
    } catch (error) {
      console.error('Failed to track verification request:', error);
    }
  }

  /**
   * Update user verification status
   */
  private async updateUserVerificationStatus(
    userId: string,
    verified: boolean
  ): Promise<void> {
    if (!db) return;
    
    try {
      // Update user document
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        emailVerified: verified,
        emailVerifiedAt: verified ? serverTimestamp() : null,
      });
      
      // Update verification tracking
      const verificationRef = doc(db, 'email_verifications', userId);
      await updateDoc(verificationRef, {
        verified,
        verifiedAt: verified ? serverTimestamp() : null,
      });
    } catch (error) {
      console.error('Failed to update verification status:', error);
    }
  }

  /**
   * Send verification reminder
   */
  async sendVerificationReminder(
    user: User
  ): Promise<void> {
    const status = await this.checkVerificationStatus(user);
    
    if (!status.verified && status.reminderNeeded) {
      // Send reminder email (could be done via cloud function)
      console.log('Verification reminder needed for user:', user.uid);
      
      // For now, just send another verification email
      await this.sendVerificationEmail(user, {
        userAgent: 'reminder',
      });
    }
  }

  /**
   * Get base URL for verification links
   */
  private getBaseUrl(): string {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    
    const env = process.env.NODE_ENV;
    if (env === 'production') {
      return 'https://doshisensei.com';
    }
    return 'http://localhost:3000';
  }

  /**
   * Clean up old verification records
   */
  async cleanupOldRecords(): Promise<void> {
    if (!db) return;
    
    // This would typically be done via a scheduled cloud function
    console.log('Cleanup of old verification records should be handled by a scheduled function');
  }
}

// Export singleton instance getter
export const getEmailVerificationService = () => EmailVerificationService.getInstance();