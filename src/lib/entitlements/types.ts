/**
 * Entitlements System Types
 * Defines what each user type can access
 */

export type UserType = 'guest' | 'free' | 'monthly' | 'yearly';
export type LimitType = 'daily' | 'total';
export type Permission = 
  | 'play_games'
  | 'do_drills'
  | 'read_articles'
  | 'read_stories'
  | 'create_lists'
  | 'save_progress'
  | 'cloud_sync'
  | 'kanji_moods'
  | 'view_stroke_order'
  | 'youtube_shadowing'
  | 'ai_explanations'
  | 'textbook_vocabulary'
  | 'premium_features'
  | '*'; // Wildcard for all permissions

export interface LimitConfig {
  daily?: Record<string, number>;
  total?: Record<string, number>;
}

export interface EntitlementRule {
  id: string;
  userTypes: UserType[];
  permissions: Permission[];
  limits: LimitConfig;
  description: string;
}

export interface EntitlementCheckResult {
  allowed: boolean;
  permissions: Permission[];
  limits: LimitConfig;
  userType: UserType;
}