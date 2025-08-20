/**
 * Maps Firebase auth error codes to user-friendly messages
 */
export function getAuthErrorMessage(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    // Sign in errors
    'auth/invalid-credential': 'Invalid email or password. Please check your credentials and try again.',
    'auth/user-not-found': 'No account found with this email address. Please sign up first.',
    'auth/wrong-password': 'Incorrect password. Please try again or reset your password.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-disabled': 'This account has been disabled. Please contact support.',
    
    // Sign up errors
    'auth/email-already-in-use': 'An account with this email already exists. Please sign in instead.',
    'auth/weak-password': 'Password is too weak. Please choose a stronger password.',
    'auth/operation-not-allowed': 'Email/password accounts are not enabled. Please contact support.',
    
    // Password reset errors
    'auth/expired-action-code': 'This password reset link has expired. Please request a new one.',
    'auth/invalid-action-code': 'This password reset link is invalid. Please request a new one.',
    
    // Network errors
    'auth/network-request-failed': 'Network error. Please check your internet connection and try again.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    
    // Other errors
    'auth/popup-closed-by-user': 'Sign in was cancelled. Please try again.',
    'auth/unauthorized-domain': 'This domain is not authorized. Please contact support.',
    'auth/internal-error': 'An unexpected error occurred. Please try again.',
    
    // Default
    'default': 'An error occurred. Please try again.'
  };

  return errorMessages[errorCode] || errorMessages['default'];
}