/**
 * GDPR Compliance Service
 * Handles data export and account deletion according to GDPR requirements
 */

import { User, deleteUser } from 'firebase/auth';
import { auth, db, storage } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { AccountDeletionRequest, UserDataExport } from './types';
import { AUTH_CONFIG } from './constants';
import { getSecurityMonitor } from './security-monitor';

export class GDPRComplianceService {
  private static instance: GDPRComplianceService | null = null;
  
  private constructor() {}
  
  static getInstance(): GDPRComplianceService {
    if (!GDPRComplianceService.instance) {
      GDPRComplianceService.instance = new GDPRComplianceService();
    }
    return GDPRComplianceService.instance;
  }

  /**
   * Request account deletion (with grace period)
   */
  async requestAccountDeletion(
    user: User,
    reason?: string
  ): Promise<{ success: boolean; message: string; scheduledDate?: Date }> {
    try {
      if (!user || !db) {
        throw new Error('User or database not available');
      }
      
      const scheduledDate = new Date(
        Date.now() + AUTH_CONFIG.ACCOUNT_DELETION_GRACE_PERIOD
      );
      
      // Create deletion request
      const request: AccountDeletionRequest = {
        userId: user.uid,
        requestedAt: new Date(),
        scheduledFor: scheduledDate,
        reason,
        confirmed: false,
      };
      
      // Store deletion request
      const requestRef = doc(db, 'account_deletion_requests', user.uid);
      await setDoc(requestRef, {
        ...request,
        requestedAt: serverTimestamp(),
        scheduledFor: Timestamp.fromDate(scheduledDate),
      });
      
      // Generate and store data export
      const exportUrl = await this.exportUserData(user);
      if (exportUrl) {
        await setDoc(requestRef, {
          dataExportUrl: exportUrl,
        }, { merge: true });
      }
      
      // Log security event
      const monitor = getSecurityMonitor();
      await monitor.logEvent(user.uid, 'account_deleted', {
        scheduled: true,
        scheduledFor: scheduledDate.toISOString(),
        reason,
      });
      
      // Send confirmation email
      await this.sendDeletionConfirmationEmail(user, scheduledDate);
      
      return {
        success: true,
        message: `Your account will be deleted on ${scheduledDate.toLocaleDateString()}. You will receive an email with your data export.`,
        scheduledDate,
      };
    } catch (error) {
      console.error('Failed to request account deletion:', error);
      return {
        success: false,
        message: 'Failed to request account deletion. Please try again.',
      };
    }
  }

  /**
   * Cancel account deletion request
   */
  async cancelAccountDeletion(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!db) {
        throw new Error('Database not available');
      }
      
      // Check if deletion request exists
      const requestRef = doc(db, 'account_deletion_requests', userId);
      const requestDoc = await getDoc(requestRef);
      
      if (!requestDoc.exists()) {
        return {
          success: false,
          message: 'No deletion request found',
        };
      }
      
      // Delete the request
      await deleteDoc(requestRef);
      
      // Log security event
      const monitor = getSecurityMonitor();
      await monitor.logEvent(userId, 'account_deleted', {
        cancelled: true,
      });
      
      return {
        success: true,
        message: 'Account deletion request cancelled successfully',
      };
    } catch (error) {
      console.error('Failed to cancel account deletion:', error);
      return {
        success: false,
        message: 'Failed to cancel deletion request',
      };
    }
  }

  /**
   * Execute immediate account deletion (after grace period)
   */
  async executeAccountDeletion(
    user: User
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!user || !db) {
        throw new Error('User or database not available');
      }
      
      // Export data one final time
      await this.exportUserData(user);
      
      // Delete all user data from Firestore
      await this.deleteAllUserData(user.uid);
      
      // Delete user authentication account
      await deleteUser(user);
      
      // Log security event (if possible)
      const monitor = getSecurityMonitor();
      await monitor.logEvent(user.uid, 'account_deleted', {
        immediate: true,
        completed: true,
      });
      
      return {
        success: true,
        message: 'Account deleted successfully',
      };
    } catch (error: any) {
      console.error('Failed to delete account:', error);
      
      if (error.code === 'auth/requires-recent-login') {
        return {
          success: false,
          message: 'Please sign in again to confirm account deletion',
        };
      }
      
      return {
        success: false,
        message: 'Failed to delete account. Please try again.',
      };
    }
  }

  /**
   * Export all user data
   */
  async exportUserData(
    user: User
  ): Promise<string | null> {
    try {
      if (!user || !db) {
        throw new Error('User or database not available');
      }
      
      const exportData: UserDataExport = {
        userId: user.uid,
        requestedAt: new Date(),
        completedAt: new Date(),
        data: {
          profile: await this.getUserProfile(user.uid),
          activities: await this.getUserActivities(user.uid),
          studyData: await this.getUserStudyData(user.uid),
          preferences: await this.getUserPreferences(user.uid),
        },
      };
      
      // Convert to JSON
      const jsonData = JSON.stringify(exportData, null, 2);
      
      // Store in Firebase Storage
      if (storage) {
        const fileName = `user-exports/${user.uid}/export-${Date.now()}.json`;
        const storageRef = ref(storage, fileName);
        
        await uploadString(storageRef, jsonData, 'raw', {
          contentType: 'application/json',
        });
        
        // Get download URL
        const downloadUrl = await getDownloadURL(storageRef);
        
        // Store export record
        const exportRef = doc(db, 'user_data_exports', `${user.uid}_${Date.now()}`);
        await setDoc(exportRef, {
          ...exportData,
          downloadUrl,
          expiresAt: new Date(Date.now() + AUTH_CONFIG.DATA_EXPORT_RETENTION),
          requestedAt: serverTimestamp(),
          completedAt: serverTimestamp(),
        });
        
        // Schedule deletion after retention period
        setTimeout(() => {
          this.deleteDataExport(fileName);
        }, AUTH_CONFIG.DATA_EXPORT_RETENTION);
        
        return downloadUrl;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to export user data:', error);
      return null;
    }
  }

  /**
   * Get user profile data
   */
  private async getUserProfile(userId: string): Promise<any> {
    if (!db) return null;
    
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        // Remove sensitive fields
        delete data.passwordHash;
        delete data.sessionTokens;
        return data;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  /**
   * Get user activities
   */
  private async getUserActivities(userId: string): Promise<any[]> {
    if (!db) return [];
    
    try {
      const activities: any[] = [];
      
      // Get security events
      const eventsQuery = query(
        collection(db, 'security_events'),
        where('userId', '==', userId)
      );
      const eventsSnapshot = await getDocs(eventsQuery);
      eventsSnapshot.forEach(doc => {
        activities.push({
          type: 'security_event',
          ...doc.data(),
        });
      });
      
      // Get study sessions
      const sessionsQuery = query(
        collection(db, 'study_sessions'),
        where('userId', '==', userId)
      );
      const sessionsSnapshot = await getDocs(sessionsQuery);
      sessionsSnapshot.forEach(doc => {
        activities.push({
          type: 'study_session',
          ...doc.data(),
        });
      });
      
      return activities;
    } catch (error) {
      console.error('Failed to get user activities:', error);
      return [];
    }
  }

  /**
   * Get user study data
   */
  private async getUserStudyData(userId: string): Promise<any[]> {
    if (!db) return [];
    
    try {
      const studyData: any[] = [];
      
      // Get vocabulary lists
      const vocabQuery = query(
        collection(db, 'vocabulary_lists'),
        where('userId', '==', userId)
      );
      const vocabSnapshot = await getDocs(vocabQuery);
      vocabSnapshot.forEach(doc => {
        studyData.push({
          type: 'vocabulary_list',
          ...doc.data(),
        });
      });
      
      // Get saved items
      const savedQuery = query(
        collection(db, 'saved_items'),
        where('userId', '==', userId)
      );
      const savedSnapshot = await getDocs(savedQuery);
      savedSnapshot.forEach(doc => {
        studyData.push({
          type: 'saved_item',
          ...doc.data(),
        });
      });
      
      return studyData;
    } catch (error) {
      console.error('Failed to get user study data:', error);
      return [];
    }
  }

  /**
   * Get user preferences
   */
  private async getUserPreferences(userId: string): Promise<any> {
    if (!db) return null;
    
    try {
      const prefsRef = doc(db, 'user_preferences', userId);
      const prefsDoc = await getDoc(prefsRef);
      
      if (prefsDoc.exists()) {
        return prefsDoc.data();
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get user preferences:', error);
      return null;
    }
  }

  /**
   * Delete all user data from Firestore
   */
  private async deleteAllUserData(userId: string): Promise<void> {
    if (!db) return;
    
    const collections = [
      'users',
      'user_preferences',
      'security_events',
      'study_sessions',
      'vocabulary_lists',
      'saved_items',
      'email_verifications',
      'account_deletion_requests',
    ];
    
    for (const collectionName of collections) {
      try {
        // Delete documents where userId matches
        const q = query(
          collection(db, collectionName),
          where('userId', '==', userId)
        );
        const snapshot = await getDocs(q);
        
        for (const doc of snapshot.docs) {
          await deleteDoc(doc.ref);
        }
        
        // Also try to delete document with userId as ID
        try {
          const docRef = doc(db, collectionName, userId);
          await deleteDoc(docRef);
        } catch (error) {
          // Document might not exist
        }
      } catch (error) {
        console.error(`Failed to delete from ${collectionName}:`, error);
      }
    }
  }

  /**
   * Delete data export from storage
   */
  private async deleteDataExport(fileName: string): Promise<void> {
    if (!storage) return;
    
    try {
      const fileRef = ref(storage, fileName);
      await deleteObject(fileRef);
    } catch (error) {
      console.error('Failed to delete data export:', error);
    }
  }

  /**
   * Send deletion confirmation email
   */
  private async sendDeletionConfirmationEmail(
    user: User,
    scheduledDate: Date
  ): Promise<void> {
    // This would typically be handled by a cloud function
    console.log(`Deletion confirmation email would be sent to ${user.email}`);
    console.log(`Scheduled deletion date: ${scheduledDate}`);
  }

  /**
   * Process scheduled deletions (called by cron job)
   */
  async processScheduledDeletions(): Promise<void> {
    if (!db) return;
    
    try {
      const now = new Date();
      
      // Get all deletion requests that are past their scheduled date
      const q = query(
        collection(db, 'account_deletion_requests'),
        where('scheduledFor', '<=', Timestamp.fromDate(now)),
        where('confirmed', '==', false)
      );
      
      const snapshot = await getDocs(q);
      
      for (const doc of snapshot.docs) {
        const request = doc.data() as AccountDeletionRequest;
        
        // Execute deletion
        // Note: This would need to be done with admin SDK in production
        console.log(`Would delete account for user: ${request.userId}`);
        
        // Mark as confirmed
        await setDoc(doc.ref, {
          confirmed: true,
          completedAt: serverTimestamp(),
        }, { merge: true });
      }
    } catch (error) {
      console.error('Failed to process scheduled deletions:', error);
    }
  }
}

// Export singleton instance getter
export const getGDPRComplianceService = () => GDPRComplianceService.getInstance();