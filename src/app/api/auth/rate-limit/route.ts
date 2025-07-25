import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter } from '@/lib/rate-limiter';

// Create rate limiters for different auth operations
const loginLimiter = new RateLimiter(15 * 60 * 1000, 5); // 5 attempts per 15 minutes

const signupLimiter = new RateLimiter(60 * 60 * 1000, 3); // 3 signups per hour

const passwordResetLimiter = new RateLimiter(60 * 60 * 1000, 3); // 3 password reset requests per hour

export async function POST(request: NextRequest) {
  try {
    const { type, identifier } = await request.json();
    
    // Get appropriate limiter based on type
    let limiter: RateLimiter;
    switch (type) {
      case 'login':
        limiter = loginLimiter;
        break;
      case 'signup':
        limiter = signupLimiter;
        break;
      case 'password-reset':
        limiter = passwordResetLimiter;
        break;
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
    
    // Check rate limit
    const allowed = limiter.isAllowed(identifier);
    const remaining = limiter.getRemainingRequests(identifier);
    const resetTime = limiter.getResetTime(identifier);
    
    if (!allowed) {
      const retryAfter = resetTime - Date.now();
      return NextResponse.json({
        allowed: false,
        retryAfter: retryAfter,
        message: `Too many attempts. Please try again in ${Math.ceil(retryAfter / 1000 / 60)} minutes.`
      }, { status: 429 });
    }
    
    return NextResponse.json({
      allowed: true,
      remaining: remaining
    });
    
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Fail open - allow request if rate limiting fails
    return NextResponse.json({ allowed: true });
  }
}