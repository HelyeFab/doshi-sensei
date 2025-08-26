/**
 * Authentication Constants and Configuration
 */

export const AUTH_CONFIG = {
  // Session settings
  SESSION_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 days
  REFRESH_THRESHOLD: 24 * 60 * 60 * 1000, // Refresh if less than 1 day remaining
  
  // Magic link settings
  MAGIC_LINK_EXPIRY: 15 * 60 * 1000, // 15 minutes
  MAGIC_LINK_COOLDOWN: 60 * 1000, // 1 minute between requests
  
  // Email verification
  EMAIL_VERIFICATION_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  EMAIL_VERIFICATION_REMINDER: 3 * 24 * 60 * 60 * 1000, // Remind after 3 days
  
  // Rate limiting
  RATE_LIMITS: {
    login: {
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
      blockDurationMs: 30 * 60 * 1000, // 30 minutes block
    },
    magicLink: {
      maxAttempts: 3,
      windowMs: 60 * 60 * 1000, // 1 hour
      blockDurationMs: 60 * 60 * 1000, // 1 hour block
    },
    passwordReset: {
      maxAttempts: 3,
      windowMs: 60 * 60 * 1000, // 1 hour
      blockDurationMs: 2 * 60 * 60 * 1000, // 2 hours block
    },
  },
  
  // Security thresholds
  SUSPICIOUS_ACTIVITY_THRESHOLD: 30, // Trust score below this triggers alerts
  MAX_CONCURRENT_SESSIONS: 5,
  
  // GDPR compliance
  ACCOUNT_DELETION_GRACE_PERIOD: 30 * 24 * 60 * 60 * 1000, // 30 days
  DATA_EXPORT_RETENTION: 7 * 24 * 60 * 60 * 1000, // 7 days
  
  // Password requirements (simple but secure)
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  PASSWORD_REQUIRE_MIXED_CASE: true,
  PASSWORD_REQUIRE_NUMBER: true,
  PASSWORD_REQUIRE_SPECIAL: false, // Keep it simple
  
  // Trusted domains for magic links
  TRUSTED_DOMAINS: [
    'localhost:3000',
    'doshisensei.com',
    'www.doshisensei.com',
  ],
} as const;

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'auth/invalid-credentials',
  USER_NOT_FOUND: 'auth/user-not-found',
  EMAIL_NOT_VERIFIED: 'auth/email-not-verified',
  TOO_MANY_ATTEMPTS: 'auth/too-many-attempts',
  INVALID_MAGIC_LINK: 'auth/invalid-magic-link',
  EXPIRED_MAGIC_LINK: 'auth/expired-magic-link',
  SUSPICIOUS_ACTIVITY: 'auth/suspicious-activity',
  ACCOUNT_LOCKED: 'auth/account-locked',
  SESSION_EXPIRED: 'auth/session-expired',
  NETWORK_ERROR: 'auth/network-error',
} as const;

export const SECURITY_MESSAGES = {
  VERIFICATION_REQUIRED: 'Please verify your email to continue',
  MAGIC_LINK_SENT: 'Check your email for the sign-in link',
  SUSPICIOUS_DETECTED: 'Unusual activity detected. Please verify your identity',
  RATE_LIMITED: 'Too many attempts. Please try again later',
  ACCOUNT_LOCKED: 'Your account has been temporarily locked for security',
  DATA_EXPORT_READY: 'Your data export is ready for download',
  DELETION_SCHEDULED: 'Your account will be deleted in 30 days. You can cancel anytime',
} as const;