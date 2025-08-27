/**
 * Security Monitoring and Suspicious Activity Detection
 * Tracks and analyzes authentication events for security threats
 */

import { 
  SecurityEvent, 
  SecurityEventType, 
  UserMetadata 
} from './types';
import { AUTH_CONFIG } from './constants';
import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';

export class SecurityMonitor {
  private static instance: SecurityMonitor | null = null;
  
  private constructor() {}
  
  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  /**
   * Calculate trust score based on user behavior
   */
  async calculateTrustScore(
    userId: string,
    metadata: Partial<UserMetadata>
  ): Promise<number> {
    let score = 100;
    
    try {
      // Get recent security events
      const events = await this.getRecentEvents(userId, 30);
      
      // Analyze patterns
      const analysis = this.analyzeEvents(events);
      
      // Deduct points for suspicious patterns
      if (analysis.failedLoginRatio > 0.5) score -= 20;
      if (analysis.locationChanges > 5) score -= 15;
      if (analysis.deviceChanges > 3) score -= 10;
      if (analysis.rapidAttempts) score -= 25;
      if (analysis.unusualHours) score -= 10;
      if (analysis.multipleIPs > 10) score -= 20;
      
      // Bonus for good behavior
      if (analysis.consistentDevice) score += 10;
      if (analysis.verifiedEmail) score += 15;
      if (analysis.longTermUser) score += 10;
      
      // Ensure score is between 0-100
      return Math.max(0, Math.min(100, score));
    } catch (error) {
      console.error('Failed to calculate trust score:', error);
      return 50; // Default middle score on error
    }
  }

  /**
   * Log security event
   */
  async logEvent(
    userId: string,
    eventType: SecurityEventType,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const event: SecurityEvent = {
        id: `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        eventType,
        timestamp: new Date(),
        ipAddress: metadata.ipAddress || 'unknown',
        userAgent: metadata.userAgent || 'unknown',
        metadata,
        riskLevel: this.assessRiskLevel(eventType, metadata),
        resolved: false,
      };
      
      // For critical client-side events, use the API endpoint
      if (typeof window !== 'undefined') {
        // Client-side: use API endpoint
        try {
          await fetch('/api/auth/security/suspicious', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              identifier: userId,
              action: eventType,
              timestamp: new Date().toISOString(),
              type: eventType,
              metadata,
            }),
          });
        } catch (error) {
          console.error('Failed to log security event via API:', error);
        }
      } else if (db) {
        // Server-side: direct Firestore write (for server-side usage)
        const eventRef = doc(db, 'security_events', event.id);
        await setDoc(eventRef, {
          ...event,
          timestamp: serverTimestamp(),
        });
      }
      
      // Check for immediate threats
      if (event.riskLevel === 'critical') {
        await this.handleCriticalThreat(userId, event);
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Get recent security events for a user
   */
  private async getRecentEvents(
    userId: string,
    days: number
  ): Promise<SecurityEvent[]> {
    if (!db) return [];
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const q = query(
        collection(db, 'security_events'),
        where('userId', '==', userId),
        where('timestamp', '>=', Timestamp.fromDate(cutoffDate)),
        orderBy('timestamp', 'desc'),
        limit(100)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date(),
      } as SecurityEvent));
    } catch (error) {
      console.error('Failed to get security events:', error);
      return [];
    }
  }

  /**
   * Analyze security events for patterns
   */
  private analyzeEvents(events: SecurityEvent[]) {
    const analysis = {
      failedLoginRatio: 0,
      locationChanges: 0,
      deviceChanges: 0,
      rapidAttempts: false,
      unusualHours: false,
      multipleIPs: 0,
      consistentDevice: false,
      verifiedEmail: false,
      longTermUser: false,
    };
    
    if (events.length === 0) return analysis;
    
    // Calculate failed login ratio
    const loginAttempts = events.filter(e => 
      e.eventType === 'login_attempt' || 
      e.eventType === 'login_success' || 
      e.eventType === 'login_failed'
    );
    const failedLogins = loginAttempts.filter(e => e.eventType === 'login_failed');
    analysis.failedLoginRatio = failedLogins.length / (loginAttempts.length || 1);
    
    // Count unique locations
    const locations = new Set(events.map(e => e.metadata.location?.country).filter(Boolean));
    analysis.locationChanges = locations.size;
    
    // Count unique devices
    const devices = new Set(events.map(e => e.metadata.deviceFingerprint).filter(Boolean));
    analysis.deviceChanges = devices.size;
    
    // Check for rapid attempts (multiple events within 1 minute)
    const timestamps = events.map(e => e.timestamp.getTime()).sort();
    for (let i = 1; i < timestamps.length; i++) {
      if (timestamps[i] - timestamps[i - 1] < 60000) {
        analysis.rapidAttempts = true;
        break;
      }
    }
    
    // Check for unusual hours (2 AM - 6 AM local time)
    const unusualHourEvents = events.filter(e => {
      const hour = e.timestamp.getHours();
      return hour >= 2 && hour <= 6;
    });
    analysis.unusualHours = unusualHourEvents.length > events.length * 0.3;
    
    // Count unique IPs
    const ips = new Set(events.map(e => e.ipAddress).filter(ip => ip !== 'unknown'));
    analysis.multipleIPs = ips.size;
    
    // Check for consistent device usage
    if (devices.size === 1 && events.length > 10) {
      analysis.consistentDevice = true;
    }
    
    // Check if email is verified
    analysis.verifiedEmail = events.some(e => e.eventType === 'email_verified');
    
    // Check if long-term user (events span > 30 days)
    if (events.length > 0) {
      const firstEvent = events[events.length - 1].timestamp;
      const lastEvent = events[0].timestamp;
      const daysDiff = (lastEvent.getTime() - firstEvent.getTime()) / (1000 * 60 * 60 * 24);
      analysis.longTermUser = daysDiff > 30;
    }
    
    return analysis;
  }

  /**
   * Assess risk level of an event
   */
  private assessRiskLevel(
    eventType: SecurityEventType,
    metadata: Record<string, any>
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Critical events
    if (
      eventType === 'account_locked' ||
      eventType === 'suspicious_activity' ||
      metadata.bruteForceAttempt
    ) {
      return 'critical';
    }
    
    // High risk events
    if (
      eventType === 'password_changed' ||
      eventType === 'email_changed' ||
      metadata.trustScore < AUTH_CONFIG.SUSPICIOUS_ACTIVITY_THRESHOLD
    ) {
      return 'high';
    }
    
    // Medium risk events
    if (
      eventType === 'login_failed' ||
      eventType === 'password_reset_requested' ||
      metadata.newDevice ||
      metadata.newLocation
    ) {
      return 'medium';
    }
    
    // Low risk events
    return 'low';
  }

  /**
   * Handle critical security threats
   */
  private async handleCriticalThreat(
    userId: string,
    event: SecurityEvent
  ): Promise<void> {
    console.error('CRITICAL SECURITY THREAT DETECTED:', event);
    
    // Notify admin immediately
    try {
      await fetch('/api/auth/security/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          event,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to send security alert:', error);
    }
    
    // Consider locking the account
    if (event.metadata.immediateAction) {
      await this.lockAccount(userId, event.metadata.reason);
    }
  }

  /**
   * Lock a user account for security
   */
  private async lockAccount(userId: string, reason: string): Promise<void> {
    if (!db) return;
    
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        accountLocked: true,
        lockReason: reason,
        lockedAt: serverTimestamp(),
      }, { merge: true });
      
      await this.logEvent(userId, 'account_locked', { reason });
    } catch (error) {
      console.error('Failed to lock account:', error);
    }
  }

  /**
   * Get security summary for admin dashboard
   */
  async getSecuritySummary(): Promise<any> {
    if (!db) return null;
    
    try {
      // Get events from last 24 hours
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - 24);
      
      const q = query(
        collection(db, 'security_events'),
        where('timestamp', '>=', Timestamp.fromDate(cutoffDate)),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const events = snapshot.docs.map(doc => ({
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date(),
      } as SecurityEvent));
      
      // Analyze events
      const summary = {
        totalEvents: events.length,
        criticalEvents: events.filter(e => e.riskLevel === 'critical').length,
        highRiskEvents: events.filter(e => e.riskLevel === 'high').length,
        failedLogins: events.filter(e => e.eventType === 'login_failed').length,
        suspiciousActivities: events.filter(e => e.eventType === 'suspicious_activity').length,
        lockedAccounts: events.filter(e => e.eventType === 'account_locked').length,
        uniqueUsers: new Set(events.map(e => e.userId)).size,
        eventsByType: {} as Record<SecurityEventType, number>,
        recentCriticalEvents: events.filter(e => e.riskLevel === 'critical').slice(0, 10),
      };
      
      // Count events by type
      for (const event of events) {
        summary.eventsByType[event.eventType] = 
          (summary.eventsByType[event.eventType] || 0) + 1;
      }
      
      return summary;
    } catch (error) {
      console.error('Failed to get security summary:', error);
      return null;
    }
  }
}

// Export singleton instance getter
export const getSecurityMonitor = () => SecurityMonitor.getInstance();