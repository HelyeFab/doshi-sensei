/**
 * Security interfaces and types for the stats system
 * Provides comprehensive security contracts following OWASP guidelines
 */

export type SecurityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';
export type ThreatType = 'SPAM' | 'BOT' | 'BRUTE_FORCE' | 'DATA_EXTRACTION' | 'XSS' | 'INJECTION' | 'CSRF';

// Core security result interface
export interface SecurityResult {
  allowed: boolean;
  reason?: string;
  threatLevel: SecurityLevel;
  recommendations?: string[];
  metadata?: Record<string, any>;
}

// Security context for requests
export interface SecurityContext {
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: number;
  endpoint: string;
  operation: string;
  data?: any;
  headers?: Record<string, string>;
}

// Rate limiting interfaces
export interface RateLimitRule {
  endpoint: string;
  windowMs: number;
  maxRequests: number;
  userType: 'guest' | 'free' | 'premium' | 'admin';
  skipIf?: (context: SecurityContext) => boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  resetTime: number;
  windowMs: number;
  rule: RateLimitRule;
}

export interface RateLimitStore {
  get(key: string): Promise<RateLimitData | null>;
  set(key: string, data: RateLimitData, ttlMs: number): Promise<void>;
  increment(key: string, amount: number, ttlMs: number): Promise<number>;
  reset(key: string): Promise<void>;
}

export interface RateLimitData {
  count: number;
  window: number;
  firstRequest: number;
}

// Logging interfaces
export interface SecureLogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  source: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  sanitized: boolean;
}

export interface PiiDetectionResult {
  hasPii: boolean;
  piiTypes: string[];
  sanitizedData: any;
  confidence: number;
}

// Input sanitization interfaces
export interface SanitizationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  maxLength?: number;
  allowedChars?: RegExp;
  htmlEncode?: boolean;
  sqlEscape?: boolean;
  removeScripts?: boolean;
  customSanitizer?: (value: any) => any;
}

export interface SanitizationResult {
  sanitized: any;
  violations: string[];
  blocked: boolean;
  reason?: string;
}

// Encryption interfaces
export interface EncryptionConfig {
  algorithm: string;
  keySize: number;
  ivSize: number;
  tagSize?: number;
}

export interface EncryptionResult {
  encrypted: string;
  iv: string;
  tag?: string;
  keyId: string;
}

export interface DecryptionResult {
  decrypted: any;
  verified: boolean;
  keyId: string;
}

// Authentication interfaces
export interface AuthenticationContext {
  userId?: string;
  token?: string;
  sessionId?: string;
  permissions: string[];
  userType: 'guest' | 'free' | 'premium' | 'admin';
  mfaEnabled: boolean;
  lastActivity: number;
}

export interface AuthorizationRule {
  operation: string;
  resource: string;
  requiredPermissions: string[];
  userTypes: string[];
  customCheck?: (context: AuthenticationContext) => boolean;
}

// Abuse detection interfaces
export interface AbusePattern {
  name: string;
  description: string;
  detector: (context: SecurityContext, history: SecurityEvent[]) => number; // 0-100 confidence
  threshold: number;
  action: 'log' | 'warn' | 'block' | 'captcha';
}

export interface SecurityEvent {
  id: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  timestamp: number;
  eventType: string;
  data: any;
  risk: SecurityLevel;
}

export interface AbuseDetectionResult {
  blocked: boolean;
  confidence: number;
  patterns: string[];
  recommendedAction: 'allow' | 'warn' | 'block' | 'captcha';
  reason: string;
}

// Main security manager interface
export interface ISecurityManager {
  validateRequest(context: SecurityContext): Promise<SecurityResult>;
  checkRateLimit(context: SecurityContext): Promise<RateLimitResult>;
  sanitizeInput(data: any, rules: SanitizationRule[]): SanitizationResult;
  encryptSensitiveData(data: any, fields: string[]): Promise<any>;
  decryptSensitiveData(data: any, fields: string[]): Promise<any>;
  authenticate(token: string): Promise<AuthenticationContext | null>;
  authorize(context: AuthenticationContext, operation: string, resource: string): boolean;
  detectAbuse(context: SecurityContext): Promise<AbuseDetectionResult>;
  logSecurityEvent(event: SecurityEvent): Promise<void>;
  getSecurityHeaders(context: SecurityContext): Record<string, string>;
}

// Logging manager interface
export interface ISecurityLogger {
  log(level: LogLevel, message: string, metadata?: any): Promise<void>;
  debug(message: string, metadata?: any): Promise<void>;
  info(message: string, metadata?: any): Promise<void>;
  warn(message: string, metadata?: any): Promise<void>;
  error(message: string, error?: Error, metadata?: any): Promise<void>;
  critical(message: string, error?: Error, metadata?: any): Promise<void>;
  audit(operation: string, context: SecurityContext, result: any): Promise<void>;
  detectPii(data: any): PiiDetectionResult;
  sanitizePii(data: any): any;
}

// Rate limiter interface
export interface IRateLimiter {
  checkLimit(key: string, rule: RateLimitRule): Promise<RateLimitResult>;
  resetLimit(key: string): Promise<void>;
  addRule(rule: RateLimitRule): void;
  removeRule(endpoint: string, userType: string): void;
  getRules(): RateLimitRule[];
}

// Input sanitizer interface
export interface IInputSanitizer {
  sanitize(data: any, rules: SanitizationRule[]): SanitizationResult;
  sanitizeString(value: string, rule: SanitizationRule): string;
  detectXss(input: string): boolean;
  detectSqlInjection(input: string): boolean;
  detectScriptTags(input: string): boolean;
  htmlEncode(input: string): string;
  sqlEscape(input: string): string;
}

// Encryption manager interface
export interface IEncryptionManager {
  encrypt(data: any, keyId?: string): Promise<EncryptionResult>;
  decrypt(encrypted: EncryptionResult): Promise<DecryptionResult>;
  encryptField(obj: any, fieldPath: string): Promise<any>;
  decryptField(obj: any, fieldPath: string): Promise<any>;
  generateKey(): Promise<string>;
  rotateKeys(): Promise<void>;
  isEncrypted(data: any): boolean;
}

// Authentication manager interface
export interface IAuthenticationManager {
  validateToken(token: string): Promise<AuthenticationContext | null>;
  validateSession(sessionId: string): Promise<AuthenticationContext | null>;
  checkPermission(context: AuthenticationContext, permission: string): boolean;
  checkUserType(context: AuthenticationContext, allowedTypes: string[]): boolean;
  isSessionExpired(context: AuthenticationContext): boolean;
  refreshSession(sessionId: string): Promise<AuthenticationContext | null>;
}

// Abuse detector interface
export interface IAbuseDetector {
  analyze(context: SecurityContext): Promise<AbuseDetectionResult>;
  addPattern(pattern: AbusePattern): void;
  removePattern(name: string): void;
  getPatterns(): AbusePattern[];
  recordEvent(event: SecurityEvent): Promise<void>;
  getEventHistory(userId?: string, ipAddress?: string, limit?: number): Promise<SecurityEvent[]>;
  clearEventHistory(userId?: string, ipAddress?: string): Promise<void>;
}

// Error types
export class SecurityError extends Error {
  constructor(
    message: string,
    public code: string,
    public level: SecurityLevel = 'MEDIUM',
    public context?: SecurityContext
  ) {
    super(message);
    this.name = 'SecurityError';
  }
}

export class RateLimitError extends SecurityError {
  constructor(
    message: string,
    public result: RateLimitResult,
    context?: SecurityContext
  ) {
    super(message, 'RATE_LIMIT_EXCEEDED', 'MEDIUM', context);
    this.name = 'RateLimitError';
  }
}

export class ValidationError extends SecurityError {
  constructor(
    message: string,
    public field: string,
    context?: SecurityContext
  ) {
    super(message, 'VALIDATION_FAILED', 'HIGH', context);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends SecurityError {
  constructor(
    message: string,
    context?: SecurityContext
  ) {
    super(message, 'AUTHENTICATION_FAILED', 'HIGH', context);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends SecurityError {
  constructor(
    message: string,
    public requiredPermission: string,
    context?: SecurityContext
  ) {
    super(message, 'AUTHORIZATION_FAILED', 'HIGH', context);
    this.name = 'AuthorizationError';
  }
}

export class AbuseDetectedError extends SecurityError {
  constructor(
    message: string,
    public patterns: string[],
    public confidence: number,
    context?: SecurityContext
  ) {
    super(message, 'ABUSE_DETECTED', 'CRITICAL', context);
    this.name = 'AbuseDetectedError';
  }
}