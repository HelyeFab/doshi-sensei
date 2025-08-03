/**
 * Sharing System Types
 */

export type ShareMethod = 
  | 'native'
  | 'clipboard' 
  | 'twitter' 
  | 'facebook' 
  | 'whatsapp' 
  | 'telegram' 
  | 'email' 
  | 'qr'
  | 'linkedin';

export type ShareTemplateType = 
  | 'general' 
  | 'achievement' 
  | 'progress' 
  | 'streak'
  | 'custom';

export interface ShareContent {
  title: string;
  text: string;
  url: string;
  image?: string;
  hashtags?: string[];
  referralCode?: string;
}

export interface ShareTemplate {
  id: string;
  type: ShareTemplateType;
  title: string;
  message: string;
  variables: string[];
  platforms: {
    twitter?: string;
    facebook?: string;
    whatsapp?: string;
    telegram?: string;
    linkedin?: string;
    email?: {
      subject: string;
      body: string;
    };
  };
}

export interface ShareEvent {
  id?: string;
  userId: string;
  timestamp: Date;
  method: ShareMethod;
  content: {
    type: ShareTemplateType;
    templateId?: string;
    context?: any;
  };
  referralCode?: string;
  result: {
    success: boolean;
    error?: string;
  };
  deviceInfo?: {
    platform: string;
    userAgent: string;
    appVersion?: string;
  };
}

export interface Referral {
  id?: string;
  referrerId: string;
  referralCode: string;
  createdAt: Date;
  expiresAt?: Date;
  status: 'active' | 'expired' | 'disabled';
  metadata?: {
    source?: string;
    campaign?: string;
    customData?: Record<string, any>;
  };
  stats?: {
    views: number;
    clicks: number;
    conversions: number;
  };
}

export interface ReferralConversion {
  id?: string;
  referralCode: string;
  referrerId: string;
  referredUserId: string;
  convertedAt: Date;
  rewardsDistributed: {
    referrer: boolean;
    referred: boolean;
  };
  rewards: {
    referrerDays: number;
    referredDays: number;
    referrerPoints?: number;
    referredPoints?: number;
  };
  metadata?: {
    signupMethod?: string;
    device?: string;
    location?: string;
  };
}

export interface UserShareStats {
  userId: string;
  totalShares: number;
  successfulShares: number;
  totalConversions: number;
  conversionRate: number;
  rewardsEarned: {
    premiumDays: number;
    points: number;
    achievements: string[];
  };
  sharesByMethod: Record<ShareMethod, number>;
  sharesByContent: Record<ShareTemplateType, number>;
  bestPerformingMethod?: ShareMethod;
  bestPerformingContent?: ShareTemplateType;
  streaks?: {
    current: number;
    longest: number;
  };
  lastUpdated?: Date;
}

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContent?: ShareContent;
  initialMethod?: ShareMethod;
}

export interface ShareResult {
  success: boolean;
  method: ShareMethod;
  error?: string;
  referralCode?: string;
}