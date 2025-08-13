import { NextRequest, NextResponse } from 'next/server';

// WaniKani API configuration
const WANIKANI_API_BASE = 'https://api.wanikani.com/v2';
const API_TOKEN = process.env.NEXT_PUBLIC_WANIKANI_API_TOKEN || 'db0708c2-d1d4-4865-948c-b31c9ebdc04e';

// Rate limiting configuration
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 60; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute in milliseconds

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getRateLimitKey(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  return `wanikani:${ip}`;
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(key);
  
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + RATE_WINDOW
    });
    return true;
  }
  
  if (limit.count >= RATE_LIMIT) {
    return false;
  }
  
  limit.count++;
  return true;
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      // If we get a 503, wait and retry with exponential backoff
      if (response.status === 503) {
        const delay = Math.min(1000 * Math.pow(2, i), 5000); // Max 5 seconds
        console.log(`[WaniKani Proxy] Got 503, retrying in ${delay}ms (attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error;
      const delay = Math.min(1000 * Math.pow(2, i), 5000);
      console.error(`[WaniKani Proxy] Request failed, retrying in ${delay}ms:`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Max retries reached');
}

export async function GET(request: NextRequest) {
  try {
    // Check rate limiting
    const rateLimitKey = getRateLimitKey(request);
    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { 
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': String(RATE_LIMIT),
            'X-RateLimit-Remaining': '0'
          }
        }
      );
    }
    
    // Get the endpoint and query parameters
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || '/subjects';
    const levels = searchParams.get('levels');
    const types = searchParams.get('types') || 'vocabulary';
    const hidden = searchParams.get('hidden') || 'false';
    const limit = searchParams.get('limit') || '1000';
    
    // Create cache key
    const cacheKey = `${endpoint}:${levels}:${types}:${hidden}:${limit}`;
    
    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('[WaniKani Proxy] Cache hit for:', cacheKey);
      return NextResponse.json(cached.data, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'public, max-age=300', // 5 minutes
        }
      });
    }
    
    // Build the full URL
    const url = new URL(`${WANIKANI_API_BASE}${endpoint}`);
    if (levels) url.searchParams.set('levels', levels);
    if (types) url.searchParams.set('types', types);
    if (hidden) url.searchParams.set('hidden', hidden);
    if (limit) url.searchParams.set('limit', limit);
    
    console.log('[WaniKani Proxy] Fetching:', url.toString());
    
    // Make the request to WaniKani API with retry logic
    const response = await fetchWithRetry(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Wanikani-Revision': '20170710',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'DoshiSensei/1.0'
      }
    });
    
    if (!response.ok) {
      console.error('[WaniKani Proxy] API error:', response.status, response.statusText);
      
      // Return a more specific error message
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid API token' },
          { status: 401 }
        );
      } else if (response.status === 404) {
        return NextResponse.json(
          { error: 'Endpoint not found' },
          { status: 404 }
        );
      } else if (response.status === 503) {
        return NextResponse.json(
          { error: 'WaniKani API is temporarily unavailable' },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { error: `WaniKani API error: ${response.statusText}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // Cache the successful response
    cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    // Clean up old cache entries (simple cleanup)
    if (cache.size > 100) {
      const entries = Array.from(cache.entries());
      const now = Date.now();
      entries.forEach(([key, value]) => {
        if (now - value.timestamp > CACHE_TTL) {
          cache.delete(key);
        }
      });
    }
    
    return NextResponse.json(data, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'public, max-age=300', // 5 minutes
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
    
  } catch (error) {
    console.error('[WaniKani Proxy] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch from WaniKani API',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}