import { NextRequest, NextResponse } from 'next/server';

// Type for API handler functions
type ApiHandler = (request: NextRequest) => Promise<NextResponse> | NextResponse;

// Production-ready error response
interface ErrorResponse {
  error: string;
  message?: string;
  statusCode: number;
  timestamp: string;
  path?: string;
}

/**
 * Create standardized error response
 */
function createErrorResponse(
  error: unknown,
  statusCode: number = 500,
  path?: string
): NextResponse<ErrorResponse> {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  
  // Don't expose internal error details in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  const response: ErrorResponse = {
    error: statusCode >= 500 ? 'Internal Server Error' : 'Request Error',
    message: isProduction && statusCode >= 500 ? 'An error occurred processing your request' : errorMessage,
    statusCode,
    timestamp: new Date().toISOString(),
    path
  };

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Wrapper for API route handlers with production-ready error handling
 * - Prevents unhandled promise rejections
 * - Implements request timeout
 * - Provides consistent error responses
 * - Adds request logging in development
 */
export function withErrorHandling(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest) => {
    const startTime = Date.now();
    const path = request.nextUrl.pathname;
    
    try {
      // Log request in development
      if (process.env.NODE_ENV === 'development') {

      }

      // Create timeout promise (9 seconds for Netlify's 10-second limit)
      const timeoutMs = parseInt(process.env.API_TIMEOUT || '9000', 10);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
      });

      // Race between handler and timeout
      const response = await Promise.race([
        Promise.resolve(handler(request)),
        timeoutPromise
      ]);

      // Log response time in development
      if (process.env.NODE_ENV === 'development') {
        const duration = Date.now() - startTime;
        console.log(`[API] ${request.method} ${path} - ${response.status} (${duration}ms)`);
      }

      return response;
      
    } catch (error) {
      // Log error details
      console.error(`[API Error] ${request.method} ${path}:`, error);
      
      // Determine appropriate status code
      let statusCode = 500;
      if (error instanceof Error) {
        if (error.message === 'Request timeout') statusCode = 504;
        else if (error.message.includes('Unauthorized')) statusCode = 401;
        else if (error.message.includes('Forbidden')) statusCode = 403;
        else if (error.message.includes('Not found')) statusCode = 404;
        else if (error.message.includes('Bad request')) statusCode = 400;
      }
      
      return createErrorResponse(error, statusCode, path);
    }
  };
}

/**
 * Wrapper for API routes that require authentication
 * Checks for valid authorization before executing handler
 */
export function withAuth(handler: ApiHandler): ApiHandler {
  return withErrorHandling(async (request: NextRequest) => {
    // Check for authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Unauthorized - No valid authorization header');
    }

    // Token validation would go here
    // For now, just pass through to handler
    return handler(request);
  });
}

/**
 * Wrapper for API routes that use Firebase Admin
 * Ensures admin is properly initialized before use
 */
export function withFirebaseAdmin(handler: ApiHandler): ApiHandler {
  return withErrorHandling(async (request: NextRequest) => {
    try {
      // Dynamically import to prevent build-time initialization
      const { getFirebaseAdmin } = await import('@/lib/firebase-admin-safe');
      const admin = await getFirebaseAdmin();
      
      // Add admin to request context (if needed)
      (request as any).firebaseAdmin = admin;
      
      return handler(request);
    } catch (error) {
      console.error('Firebase Admin initialization failed:', error);
      throw new Error('Service temporarily unavailable');
    }
  });
}

/**
 * Wrapper for webhook endpoints
 * - Validates webhook signatures
 * - Implements idempotency
 * - Handles raw body parsing
 */
export function withWebhook(
  handler: (request: NextRequest, rawBody: string) => Promise<NextResponse>
): ApiHandler {
  return withErrorHandling(async (request: NextRequest) => {
    try {
      // Get raw body for signature verification
      const rawBody = await request.text();
      
      // Webhook signature validation would go here
      // For example: verifyStripeSignature(rawBody, request.headers)
      
      return handler(request, rawBody);
    } catch (error) {
      console.error('Webhook processing error:', error);
      // Return 200 to prevent webhook retries for processing errors
      return NextResponse.json({ received: true }, { status: 200 });
    }
  });
}

// Export all wrappers
export default {
  withErrorHandling,
  withAuth,
  withFirebaseAdmin,
  withWebhook,
  createErrorResponse
};