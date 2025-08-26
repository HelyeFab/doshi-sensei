/**
 * Authentication debugging utilities for production
 * Helps diagnose Google Sign-In redirect issues
 */

export const authDebug = {
  /**
   * Check and log authentication environment
   */
  checkEnvironment: () => {
    if (typeof window === 'undefined') return;
    
    const info = {
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      pathname: window.location.pathname,
      isProduction: process.env.NODE_ENV === 'production',
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      isNetlify: window.location.hostname.includes('netlify'),
      redirectFlag: sessionStorage.getItem('googleAuthRedirect'),
      userAgent: navigator.userAgent,
      isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
    };
    
    console.group('🔐 Auth Environment Check');
    console.table(info);
    console.groupEnd();
    
    return info;
  },
  
  /**
   * Log redirect URI information
   */
  logRedirectInfo: () => {
    if (typeof window === 'undefined') return;
    
    const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    const currentOrigin = window.location.origin;
    
    console.group('🔄 Redirect URI Info');
    console.log('Current Origin:', currentOrigin);
    console.log('Auth Domain:', authDomain);
    console.log('Expected Redirect URI:', `https://${authDomain}/__/auth/handler`);
    console.log('Alternative Redirect URI:', `${currentOrigin}/__/auth/handler`);
    console.groupEnd();
  },
  
  /**
   * Check for common issues
   */
  diagnoseIssues: () => {
    if (typeof window === 'undefined') return [];
    
    const issues = [];
    const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    const hostname = window.location.hostname;
    
    // Check if auth domain is configured
    if (!authDomain) {
      issues.push({
        severity: 'error',
        message: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is not configured',
      });
    }
    
    // Check if we're on a different domain than authDomain
    if (authDomain && !authDomain.includes(hostname) && hostname !== 'localhost') {
      issues.push({
        severity: 'warning',
        message: `Current domain (${hostname}) differs from auth domain (${authDomain})`,
        solution: 'Ensure this domain is added to Firebase Authorized Domains',
      });
    }
    
    // Check if we're on HTTP in production
    if (window.location.protocol === 'http:' && hostname !== 'localhost') {
      issues.push({
        severity: 'error',
        message: 'Using HTTP in production - Google Sign-In requires HTTPS',
      });
    }
    
    // Check for redirect loop
    const redirectFlag = sessionStorage.getItem('googleAuthRedirect');
    if (redirectFlag === 'pending') {
      issues.push({
        severity: 'info',
        message: 'Google auth redirect is pending',
        solution: 'This should clear after successful authentication',
      });
    }
    
    if (issues.length > 0) {
      console.group('⚠️ Auth Diagnostic Issues');
      issues.forEach(issue => {
        const icon = issue.severity === 'error' ? '❌' : 
                     issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${icon} ${issue.message}`);
        if (issue.solution) {
          console.log(`   💡 ${issue.solution}`);
        }
      });
      console.groupEnd();
    } else {
      console.log('✅ No auth configuration issues detected');
    }
    
    return issues;
  },
  
  /**
   * Clear authentication state (useful for debugging)
   */
  clearAuthState: () => {
    if (typeof window === 'undefined') return;
    
    sessionStorage.removeItem('googleAuthRedirect');
    console.log('✅ Cleared auth redirect flag');
  },
};

// Auto-run diagnostics in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.authDebug = authDebug;
  console.log('🔧 Auth debug utilities available at window.authDebug');
}