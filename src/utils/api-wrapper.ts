import { NextRequest, NextResponse } from 'next/server';

/**
 * Wrapper for API route handlers to ensure proper error handling in Netlify
 * This prevents unhandled promise rejections that cause Lambda runtime errors
 */
export function withErrorHandling(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    try {
      // Set a timeout to ensure we respond before Netlify's timeout
      const timeoutPromise = new Promise<NextResponse>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 9000); // 9 seconds (Netlify has 10s timeout)
      });

      // Race between the handler and timeout
      const response = await Promise.race([
        handler(request),
        timeoutPromise
      ]);

      return response;
    } catch (error) {
      console.error('API route error:', error);
      
      // Always return a proper response to prevent Lambda errors
      return NextResponse.json(
        { 
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Wrapper for API routes that use Firebase Admin
 * Ensures admin is not initialized during build time
 */
export function withFirebaseAdmin<T extends (...args: any[]) => any>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    // Only initialize Firebase Admin when the function is actually called
    // This prevents initialization during build time
    const { getAdmin } = await import('@/lib/firebase-admin');
    const admin = getAdmin();
    
    // Make admin available globally for the request
    (global as any).__firebaseAdmin = admin;
    
    try {
      return await handler(...args);
    } finally {
      // Clean up global reference
      delete (global as any).__firebaseAdmin;
    }
  }) as T;
}