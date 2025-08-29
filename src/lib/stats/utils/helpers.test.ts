/**
 * Unit tests for the ValidationUtils.isGuestUser() helper method
 * This tests the centralized guest user detection logic
 */

import { ValidationUtils } from './helpers';

describe('ValidationUtils.isGuestUser', () => {
  test('should identify null/undefined as guest users', () => {
    expect(ValidationUtils.isGuestUser(null)).toBe(true);
    expect(ValidationUtils.isGuestUser(undefined)).toBe(true);
    expect(ValidationUtils.isGuestUser('')).toBe(true);
  });

  test('should identify exact guest matches', () => {
    expect(ValidationUtils.isGuestUser('guest')).toBe(true);
    expect(ValidationUtils.isGuestUser('anonymous')).toBe(true);
    expect(ValidationUtils.isGuestUser('anonymous_donor')).toBe(true);
  });

  test('should identify guest patterns', () => {
    expect(ValidationUtils.isGuestUser('user_guest')).toBe(true);
    expect(ValidationUtils.isGuestUser('guest_123')).toBe(true);
    expect(ValidationUtils.isGuestUser('temp_guest_user')).toBe(true);
  });

  test('should identify anonymous patterns', () => {
    expect(ValidationUtils.isGuestUser('anon_user')).toBe(true);
    expect(ValidationUtils.isGuestUser('anonymous_123')).toBe(true);
    expect(ValidationUtils.isGuestUser('anon123')).toBe(true);
  });

  test('should identify suffix patterns', () => {
    expect(ValidationUtils.isGuestUser('temp_guest')).toBe(true);
    expect(ValidationUtils.isGuestUser('user_guest')).toBe(true);
  });

  test('should identify valid users as non-guests', () => {
    expect(ValidationUtils.isGuestUser('abc123xyz')).toBe(false);
    expect(ValidationUtils.isGuestUser('user_12345')).toBe(false);
    expect(ValidationUtils.isGuestUser('firebase_uid_123')).toBe(false);
    expect(ValidationUtils.isGuestUser('abcdefghijklmnop')).toBe(false);
  });

  test('should handle edge cases', () => {
    // Non-string types are treated as guest users
    expect(ValidationUtils.isGuestUser(123 as any)).toBe(true);
    expect(ValidationUtils.isGuestUser({} as any)).toBe(true);
    expect(ValidationUtils.isGuestUser([] as any)).toBe(true);
  });

  test('should reject user IDs containing guest words in context', () => {
    expect(ValidationUtils.isGuestUser('guestlike')).toBe(true); // contains 'guest'
    expect(ValidationUtils.isGuestUser('myguest')).toBe(true);   // contains 'guest'
    expect(ValidationUtils.isGuestUser('anon123')).toBe(true); // starts with 'anon'
  });

  test('should accept user IDs that do not match guest patterns', () => {
    expect(ValidationUtils.isGuestUser('registered_user')).toBe(false);
    expect(ValidationUtils.isGuestUser('premium_user_123')).toBe(false);
    expect(ValidationUtils.isGuestUser('firebase_auth_uid')).toBe(false);
  });
});

describe('ValidationUtils.logGuestWarning', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('should log warning for guest user operations', () => {
    ValidationUtils.logGuestWarning('test operation', 'guest');
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Guest user attempted test operation - blocked')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('UserID: "guest..."')
    );
  });

  test('should safely handle null/undefined user IDs in logs', () => {
    ValidationUtils.logGuestWarning('test operation', null);
    ValidationUtils.logGuestWarning('test operation', undefined);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('UserID: null/undefined')
    );
  });

  test('should truncate long user IDs for security', () => {
    const longUserId = 'very_long_user_id_that_should_be_truncated_for_security';
    ValidationUtils.logGuestWarning('test operation', longUserId);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"very_long_us..."')
    );
  });
});

describe('ValidationUtils.isValidUserId', () => {
  test('should use isGuestUser for validation', () => {
    // Valid users (not guests)
    expect(ValidationUtils.isValidUserId('valid_user_123')).toBe(true);
    expect(ValidationUtils.isValidUserId('firebase_auth_uid')).toBe(true);
    
    // Invalid users (guests)
    expect(ValidationUtils.isValidUserId('guest')).toBe(false);
    expect(ValidationUtils.isValidUserId('anonymous')).toBe(false);
    expect(ValidationUtils.isValidUserId('temp_guest')).toBe(false);
    expect(ValidationUtils.isValidUserId('')).toBe(false);
  });
});