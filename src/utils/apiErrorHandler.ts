import { NextRequest, NextResponse } from 'next/server';

/**
 * Wraps API route handlers with error handling to prevent 502 errors
 * from unhandled promise rejections
 */
export function withErrorHandling(
  handler: (req: NextRequest) => Promise<Response>
) {
  return async (req: NextRequest) => {
    try {
      // Add timeout warning after 8 seconds (before Netlify's 10s limit)
      const timeoutWarning = setTimeout(() => {
        console.warn('[API] Route is taking longer than 8 seconds:', req.url);
      }, 8000);

      const response = await handler(req);
      
      clearTimeout(timeoutWarning);
      
      return response;
    } catch (error) {
      console.error('[API Error]', req.url, error);
      
      // Return proper error response instead of letting it crash
      if (error instanceof Error) {
        return NextResponse.json(
          { 
            error: error.message,
            type: 'api_error',
            timestamp: new Date().toISOString()
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Internal server error',
          type: 'unknown_error',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Helper to create a timeout promise
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}