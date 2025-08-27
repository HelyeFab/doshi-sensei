/**
 * Admin Configuration
 * Centralized admin settings for consistent access control
 */

// List of admin emails - Add new admins here
export const ADMIN_EMAILS = [
  'mate.fizir@gmail.com',
  'emmanuelfabiani23@gmail.com'
] as const;

// Primary admin email (for notifications, etc)
export const PRIMARY_ADMIN_EMAIL = ADMIN_EMAILS[0];

// Helper to check if an email is an admin
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email as any);
}

// Admin verification levels
export enum AdminVerificationLevel {
  CLIENT_EMAIL = 'client_email',      // Level 1: Email check
  SERVER_TOKEN = 'server_token',      // Level 2: Server-side token verification
  CUSTOM_CLAIM = 'custom_claim',      // Level 3: Firebase custom claims
}

// Admin features configuration
export const ADMIN_FEATURES = {
  // User management
  canManageUsers: true,
  canViewUserDetails: true,
  canUpdateSubscriptions: true,
  canDeleteUsers: true,
  
  // Content management
  canManageStories: true,
  canManageArticles: true,
  canManageResources: true,
  
  // System administration
  canViewAnalytics: true,
  canViewLogs: true,
  canManageFeatures: true,
  canAccessDebugTools: true,
  
  // Financial
  canViewPaymentData: true,
  canProcessRefunds: true,
} as const;

// Admin API endpoints
export const ADMIN_API_ENDPOINTS = {
  VERIFY_ROLE: '/api/admin/verify-role',
  GET_STATS: '/api/admin/stats',
  GET_USERS: '/api/admin/users',
  UPDATE_USER: '/api/admin/users/update',
} as const;