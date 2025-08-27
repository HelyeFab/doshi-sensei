/**
 * Main Authentication Service
 * Orchestrates all auth operations with security best practices
 */

import {
  User,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { AuthUser, AuthSession, AuthProvider, UserMetadata } from './types';
import { AUTH_CONFIG, AUTH_ERRORS } from './constants';
import { getMagicLinkService } from './magic-link';
import { getEmailVerificationService } from './email-verification';
import { getGDPRComplianceService } from './gdpr-compliance';
import { getSecurityMonitor } from './security-monitor';
import { getRateLimiter } from './rate-limiter';

export class AuthService {
  private static instance: AuthService | null = null;
  private currentSession: AuthSession | null = null;
  private magicLink = getMagicLinkService();
  private emailVerification = getEmailVerificationService();
  private gdprCompliance = getGDPRComplianceService();
  private securityMonitor = getSecurityMonitor();
  private rateLimiter = getRateLimiter();
  
  private constructor() {
    this.initializeAuthListener();
    this.checkRedirectResult();
  }
  
  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Check for redirect result from Google Sign-In
   */
  private async checkRedirectResult(): Promise<void> {
    if (!auth || typeof window === 'undefined') return;
    
    try {
      const result = await getRedirectResult(auth);
      if (result?.user) {
        // User signed in via redirect
        const authUser = await this.createAuthUser(result.user, 'google');
        
        // Log security event
        await this.securityMonitor.logEvent(result.user.uid, 'login_success', {
          provider: 'google',
          method: 'redirect',
        });
      }
    } catch (error) {
      // Silently handle redirect errors (usually means no redirect was pending)
      console.debug('No redirect result pending:', error);
    }
  }

  /**
   * Initialize auth state listener
   */
  private initializeAuthListener(): void {
    if (!auth) return;
    
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        await this.handleUserSignIn(user);
      } else {
        await this.handleUserSignOut();
      }
    });
  }

  /**
   * Send magic link for sign in
   */
  async sendMagicLink(
    email: string,
    metadata?: Partial<UserMetadata>
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Get user metadata
      const fullMetadata = await this.getUserMetadata(metadata);
      
      // Send magic link
      const result = await this.magicLink.sendMagicLink(email, {
        ipAddress: fullMetadata.ipAddress,
        userAgent: fullMetadata.userAgent,
      });
      
      return result;
    } catch (error) {
      console.error('Failed to send magic link:', error);
      return {
        success: false,
        message: 'Failed to send magic link. Please try again.',
      };
    }
  }

  /**
   * Verify magic link and complete sign in
   */
  async verifyMagicLink(
    email: string,
    token: string,
    link?: string
  ): Promise<{ success: boolean; user?: AuthUser; message?: string }> {
    try {
      const result = await this.magicLink.verifyMagicLink(email, token, link);
      
      if (result.success && result.user) {
        const authUser = await this.createAuthUser(result.user);
        return {
          success: true,
          user: authUser,
        };
      }
      
      return result;
    } catch (error) {
      console.error('Failed to verify magic link:', error);
      return {
        success: false,
        message: 'Failed to verify magic link.',
      };
    }
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle(
    metadata?: Partial<UserMetadata>
  ): Promise<{ success: boolean; user?: AuthUser; message?: string }> {
    try {
      if (!auth) {
        throw new Error('Authentication not initialized');
      }
      
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account',
        access_type: 'offline',
        include_granted_scopes: 'true',
      });
      
      // Add scope for profile picture
      provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
      
      // Try popup first, but fall back to redirect if it fails due to COOP
      try {
        const result = await signInWithPopup(auth, provider);
        
        if (result.user) {
          const authUser = await this.createAuthUser(result.user, 'google');
          
          // Log security event
          await this.securityMonitor.logEvent(result.user.uid, 'login_success', {
            provider: 'google',
            ...metadata,
          });
          
          return {
            success: true,
            user: authUser,
          };
        }
      } catch (popupError: any) {
        // If popup fails due to COOP or other reasons, use redirect
        if (popupError.code === 'auth/popup-blocked' || 
            popupError.code === 'auth/cancelled-popup-request' ||
            popupError.message?.includes('Cross-Origin-Opener-Policy')) {
          // Use redirect flow instead
          await signInWithRedirect(auth, provider);
          // This will redirect the page, so we won't return here
          return {
            success: true,
            message: 'Redirecting to Google sign-in...',
          };
        }
        // Re-throw if it's a different error
        throw popupError;
      }
      
      return {
        success: false,
        message: 'Failed to sign in with Google',
      };
    } catch (error: any) {
      console.error('Google sign in error:', error);
      
      // Log failed attempt
      await this.securityMonitor.logEvent('unknown', 'login_failed', {
        provider: 'google',
        error: error.message,
        ...metadata,
      });
      
      return {
        success: false,
        message: error.message || 'Failed to sign in with Google',
      };
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    try {
      if (!auth) return;
      
      const user = auth.currentUser;
      if (user) {
        await this.securityMonitor.logEvent(user.uid, 'login_success', {
          action: 'logout',
        });
      }
      
      await signOut(auth);
      await this.handleUserSignOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(
    metadata?: Partial<UserMetadata>
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = auth?.currentUser;
      if (!user) {
        return {
          success: false,
          message: 'No user signed in',
        };
      }
      
      const fullMetadata = await this.getUserMetadata(metadata);
      return await this.emailVerification.sendVerificationEmail(user, {
        ipAddress: fullMetadata.ipAddress,
        userAgent: fullMetadata.userAgent,
      });
    } catch (error) {
      console.error('Failed to send verification email:', error);
      return {
        success: false,
        message: 'Failed to send verification email',
      };
    }
  }

  /**
   * Request account deletion (GDPR compliant)
   */
  async requestAccountDeletion(
    reason?: string
  ): Promise<{ success: boolean; message: string; scheduledDate?: Date }> {
    try {
      const user = auth?.currentUser;
      if (!user) {
        return {
          success: false,
          message: 'No user signed in',
        };
      }
      
      return await this.gdprCompliance.requestAccountDeletion(user, reason);
    } catch (error) {
      console.error('Failed to request account deletion:', error);
      return {
        success: false,
        message: 'Failed to request account deletion',
      };
    }
  }

  /**
   * Cancel account deletion request
   */
  async cancelAccountDeletion(): Promise<{ success: boolean; message: string }> {
    try {
      const user = auth?.currentUser;
      if (!user) {
        return {
          success: false,
          message: 'No user signed in',
        };
      }
      
      return await this.gdprCompliance.cancelAccountDeletion(user.uid);
    } catch (error) {
      console.error('Failed to cancel account deletion:', error);
      return {
        success: false,
        message: 'Failed to cancel account deletion',
      };
    }
  }

  /**
   * Export user data (GDPR compliant)
   */
  async exportUserData(): Promise<{ success: boolean; downloadUrl?: string; message?: string }> {
    try {
      const user = auth?.currentUser;
      if (!user) {
        return {
          success: false,
          message: 'No user signed in',
        };
      }
      
      const url = await this.gdprCompliance.exportUserData(user);
      
      if (url) {
        return {
          success: true,
          downloadUrl: url,
        };
      }
      
      return {
        success: false,
        message: 'Failed to export user data',
      };
    } catch (error) {
      console.error('Failed to export user data:', error);
      return {
        success: false,
        message: 'Failed to export user data',
      };
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    updates: {
      displayName?: string;
      photoURL?: string;
    }
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const user = auth?.currentUser;
      if (!user) {
        return {
          success: false,
          message: 'No user signed in',
        };
      }
      
      await updateProfile(user, updates);
      
      // Update Firestore document
      if (db) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          ...updates,
          updatedAt: serverTimestamp(),
        });
      }
      
      return {
        success: true,
      };
    } catch (error) {
      console.error('Failed to update profile:', error);
      return {
        success: false,
        message: 'Failed to update profile',
      };
    }
  }

  /**
   * Handle user sign in
   */
  private async handleUserSignIn(user: User): Promise<void> {
    try {
      // Create/update user document
      await this.createOrUpdateUserDocument(user);
      
      // Create session
      await this.createSession(user);
      
      // Check email verification status
      if (!user.emailVerified) {
        const verificationStatus = await this.emailVerification.checkVerificationStatus(user);
        if (verificationStatus.reminderNeeded) {
          await this.emailVerification.sendVerificationReminder(user);
        }
      }
      
      // Calculate trust score
      const metadata = await this.getUserMetadata();
      const trustScore = await this.securityMonitor.calculateTrustScore(
        user.uid,
        metadata
      );
      
      // Update user metadata with trust score
      if (db) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          'metadata.trustScore': trustScore,
          lastLoginAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Failed to handle user sign in:', error);
    }
  }

  /**
   * Handle user sign out
   */
  private async handleUserSignOut(): Promise<void> {
    try {
      // Clear session
      if (this.currentSession) {
        await this.endSession(this.currentSession.sessionId);
      }
      this.currentSession = null;
      
      // Clear rate limiter for this user
      if (auth?.currentUser) {
        this.rateLimiter.reset(auth.currentUser.uid);
      }
    } catch (error) {
      console.error('Failed to handle user sign out:', error);
    }
  }

  /**
   * Create AuthUser from Firebase User
   */
  private async createAuthUser(
    user: User,
    provider: AuthProvider = 'magic-link'
  ): Promise<AuthUser> {
    const metadata = await this.getUserMetadata();
    const trustScore = await this.securityMonitor.calculateTrustScore(
      user.uid,
      metadata
    );
    
    return {
      uid: user.uid,
      email: user.email!,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
      createdAt: new Date(user.metadata.creationTime!),
      lastLoginAt: new Date(user.metadata.lastSignInTime!),
      provider,
      metadata: {
        ...metadata,
        trustScore,
      },
    };
  }

  /**
   * Create or update user document
   */
  private async createOrUpdateUserDocument(user: User): Promise<void> {
    if (!db) return;
    
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      // Create new user document
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        subscription: {
          type: 'free',
          status: 'active',
        },
      });
    } else {
      // Update existing user
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp(),
        emailVerified: user.emailVerified,
        displayName: user.displayName,
        photoURL: user.photoURL,
      });
    }
  }

  /**
   * Create session
   */
  private async createSession(user: User): Promise<void> {
    if (!db) return;
    
    const metadata = await this.getUserMetadata();
    const sessionId = this.generateSessionId();
    
    const session: AuthSession = {
      userId: user.uid,
      sessionId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + AUTH_CONFIG.SESSION_DURATION),
      ipAddress: metadata.ipAddress || 'unknown',
      userAgent: metadata.userAgent || 'unknown',
      isActive: true,
    };
    
    this.currentSession = session;
    
    // Store in Firestore
    const sessionRef = doc(db, 'sessions', sessionId);
    await setDoc(sessionRef, {
      ...session,
      createdAt: serverTimestamp(),
      expiresAt: serverTimestamp(),
    });
  }

  /**
   * End session
   */
  private async endSession(sessionId: string): Promise<void> {
    if (!db) return;
    
    try {
      // First check if the session exists
      const sessionRef = doc(db, 'sessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);
      
      // Only update if session exists and is active
      if (sessionSnap.exists() && sessionSnap.data()?.isActive) {
        await updateDoc(sessionRef, {
          isActive: false,
          endedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      // Silently fail - session management is non-critical
      // This can happen if the user never had a session created
      if (typeof window !== 'undefined') {
        console.debug('Session cleanup skipped:', error);
      }
    }
  }

  /**
   * Get user metadata
   */
  private async getUserMetadata(
    partial?: Partial<UserMetadata>
  ): Promise<UserMetadata> {
    const metadata: UserMetadata = {
      trustScore: 50, // Default trust score
      ...partial,
    };
    
    if (typeof window !== 'undefined') {
      // Get IP address (would need a service in production)
      metadata.ipAddress = metadata.ipAddress || 'client-ip';
      
      // Get user agent
      metadata.userAgent = metadata.userAgent || navigator.userAgent;
      
      // Get device fingerprint (simplified version)
      metadata.deviceFingerprint = this.getDeviceFingerprint();
    }
    
    return metadata;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get device fingerprint
   */
  private getDeviceFingerprint(): string {
    if (typeof window === 'undefined') return 'unknown';
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      navigator.platform,
      new Date().getTimezoneOffset(),
      screen.width,
      screen.height,
      screen.colorDepth,
    ].join('|');
    
    // Simple hash (in production, use a proper fingerprinting library)
    return btoa(fingerprint).substr(0, 16);
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return auth?.currentUser || null;
  }

  /**
   * Get current session
   */
  getCurrentSession(): AuthSession | null {
    return this.currentSession;
  }
}

// Export singleton instance getter
export const getAuthService = () => AuthService.getInstance();