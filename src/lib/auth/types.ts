/**
 * Authentication Types and Interfaces
 * Following Google's security best practices
 */

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  createdAt: Date;
  lastLoginAt: Date;
  provider: AuthProvider;
  metadata: UserMetadata;
}

export interface UserMetadata {
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country?: string;
    city?: string;
  };
  deviceFingerprint?: string;
  trustScore: number; // 0-100, for suspicious activity detection
}

export type AuthProvider = 'email' | 'google' | 'magic-link';

export interface AuthSession {
  userId: string;
  sessionId: string;
  createdAt: Date;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
}

export interface SecurityEvent {
  id: string;
  userId: string;
  eventType: SecurityEventType;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
}

export type SecurityEventType = 
  | 'login_attempt'
  | 'login_success'
  | 'login_failed'
  | 'password_reset_requested'
  | 'password_changed'
  | 'email_changed'
  | 'account_locked'
  | 'suspicious_activity'
  | 'magic_link_sent'
  | 'magic_link_used'
  | 'account_deleted'
  | 'data_exported'
  | 'verification_email_sent'
  | 'email_verified';

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface MagicLinkData {
  email: string;
  token: string;
  createdAt: Date;
  expiresAt: Date;
  used: boolean;
  ipAddress: string;
  userAgent: string;
}

export interface AccountDeletionRequest {
  userId: string;
  requestedAt: Date;
  scheduledFor: Date; // GDPR: 30 days grace period
  reason?: string;
  dataExportUrl?: string;
  confirmed: boolean;
}

export interface UserDataExport {
  userId: string;
  requestedAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
  expiresAt?: Date;
  data: {
    profile: any;
    activities: any[];
    studyData: any[];
    preferences: any;
  };
}