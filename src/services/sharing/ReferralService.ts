/**
 * Referral Service
 * Manages referral codes, tracking, and reward distribution
 */

import { 
  Referral, 
  ReferralConversion, 
  UserShareStats 
} from '@/types/sharing';
import { db } from '@/lib/firebase';
import { 
  collection, 
  doc,
  addDoc, 
  getDocs, 
  getDoc,
  updateDoc,
  query, 
  where, 
  orderBy,
  limit,
  serverTimestamp,
  increment,
  writeBatch,
  Timestamp
} from 'firebase/firestore';

export class ReferralService {
  private static instance: ReferralService;
  
  static getInstance(): ReferralService {
    if (!ReferralService.instance) {
      ReferralService.instance = new ReferralService();
    }
    return ReferralService.instance;
  }
  
  /**
   * Generate or get existing referral code for user
   */
  async generateReferralCode(userId: string): Promise<string> {
    try {
      // Check if user already has an active referral code
      const existingCode = await this.getUserReferralCode(userId);
      if (existingCode) {
        return existingCode;
      }
      
      // Generate new code
      const code = this.createUniqueCode(userId);
      
      // Save to Firestore
      const referral: Omit<Referral, 'id'> = {
        referrerId: userId,
        referralCode: code,
        createdAt: new Date(),
        status: 'active',
        stats: {
          views: 0,
          clicks: 0,
          conversions: 0
        }
      };
      
      await addDoc(collection(db, 'referrals'), {
        ...referral,
        createdAt: serverTimestamp()
      });
      
      return code;
    } catch (error) {
      console.error('Failed to generate referral code:', error);
      throw new Error('Failed to generate referral code');
    }
  }
  
  /**
   * Get user's existing referral code
   */
  private async getUserReferralCode(userId: string): Promise<string | null> {
    try {
      const q = query(
        collection(db, 'referrals'),
        where('referrerId', '==', userId),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const referral = snapshot.docs[0].data() as Referral;
        return referral.referralCode;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get user referral code:', error);
      return null;
    }
  }
  
  /**
   * Create unique referral code
   */
  private createUniqueCode(userId: string): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 6);
    const userPart = userId.substring(0, 4);
    
    // Create 8-character code
    const code = `${userPart}${timestamp.slice(-2)}${randomPart}`.toUpperCase();
    return code.substring(0, 8);
  }
  
  /**
   * Validate referral code
   */
  async validateReferralCode(code: string): Promise<{ valid: boolean; referrerId?: string }> {
    try {
      const q = query(
        collection(db, 'referrals'),
        where('referralCode', '==', code),
        where('status', '==', 'active'),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const referral = snapshot.docs[0].data() as Referral;
        
        // Check if expired
        if (referral.expiresAt && referral.expiresAt < new Date()) {
          return { valid: false };
        }
        
        return { 
          valid: true, 
          referrerId: referral.referrerId 
        };
      }
      
      return { valid: false };
    } catch (error) {
      console.error('Failed to validate referral code:', error);
      return { valid: false };
    }
  }
  
  /**
   * Process referral conversion
   */
  async processConversion(referralCode: string, newUserId: string): Promise<void> {
    try {
      // Validate referral code
      const validation = await this.validateReferralCode(referralCode);
      if (!validation.valid || !validation.referrerId) {
        throw new Error('Invalid referral code');
      }
      
      // Prevent self-referral
      if (validation.referrerId === newUserId) {
        throw new Error('Cannot refer yourself');
      }
      
      // Check for existing conversion
      const existingConversion = await this.checkExistingConversion(referralCode, newUserId);
      if (existingConversion) {
        throw new Error('Referral already claimed');
      }
      
      // Create conversion record
      const conversion: Omit<ReferralConversion, 'id'> = {
        referralCode,
        referrerId: validation.referrerId,
        referredUserId: newUserId,
        convertedAt: new Date(),
      };
      
      await addDoc(collection(db, 'referralConversions'), {
        ...conversion,
        convertedAt: serverTimestamp()
      });
      
      // Update referral stats
      await this.updateReferralStats(referralCode);
      
      // Note: Reward distribution will be handled by Cloud Functions
    } catch (error) {
      console.error('Failed to process referral conversion:', error);
      throw error;
    }
  }
  
  /**
   * Check if conversion already exists
   */
  private async checkExistingConversion(
    referralCode: string, 
    newUserId: string
  ): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'referralConversions'),
        where('referralCode', '==', referralCode),
        where('referredUserId', '==', newUserId),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('Failed to check existing conversion:', error);
      return false;
    }
  }
  
  /**
   * Update referral stats
   */
  private async updateReferralStats(referralCode: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'referrals'),
        where('referralCode', '==', referralCode),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docRef = snapshot.docs[0].ref;
        await updateDoc(docRef, {
          'stats.conversions': increment(1)
        });
      }
    } catch (error) {
      console.error('Failed to update referral stats:', error);
    }
  }
  
  
  /**
   * Get user's referral stats
   */
  async getUserReferralStats(userId: string): Promise<UserShareStats> {
    try {
      // Get share events
      const shareEventsQuery = query(
        collection(db, 'shareEvents'),
        where('userId', '==', userId)
      );
      const shareEvents = await getDocs(shareEventsQuery);
      
      // Get conversions
      const conversionsQuery = query(
        collection(db, 'referralConversions'),
        where('referrerId', '==', userId)
      );
      const conversions = await getDocs(conversionsQuery);
      
      // Calculate stats
      const totalShares = shareEvents.size;
      const successfulShares = shareEvents.docs.filter(
        doc => doc.data().result?.success === true
      ).length;
      const totalConversions = conversions.size;
      
      // Group shares by method
      const sharesByMethod: Record<string, number> = {};
      const sharesByContent: Record<string, number> = {};
      
      shareEvents.forEach(doc => {
        const data = doc.data();
        sharesByMethod[data.method] = (sharesByMethod[data.method] || 0) + 1;
        sharesByContent[data.content?.type || 'general'] = 
          (sharesByContent[data.content?.type || 'general'] || 0) + 1;
      });
      
      // Calculate rewards earned (no premium days anymore)
      const rewardsEarned = {
        premiumDays: 0,
        points: 0, // Future feature
        achievements: [] // Future feature
      };
      
      return {
        userId,
        totalShares,
        successfulShares,
        totalConversions,
        conversionRate: totalShares > 0 ? totalConversions / totalShares : 0,
        rewardsEarned,
        sharesByMethod: sharesByMethod as any,
        sharesByContent: sharesByContent as any,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Failed to get user referral stats:', error);
      throw error;
    }
  }
  
  /**
   * Track referral link click
   */
  async trackReferralClick(referralCode: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'referrals'),
        where('referralCode', '==', referralCode),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docRef = snapshot.docs[0].ref;
        await updateDoc(docRef, {
          'stats.clicks': increment(1)
        });
      }
    } catch (error) {
      console.error('Failed to track referral click:', error);
    }
  }
}