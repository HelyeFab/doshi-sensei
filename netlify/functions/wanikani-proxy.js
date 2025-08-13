const axios = require('axios');

/**
 * Netlify Function: WaniKani API Proxy
 * 
 * This function acts as a proxy for the WaniKani API to bypass CORS restrictions
 * when calling from the browser. It forwards requests to the WaniKani API
 * and returns the results with retry logic and caching.
 * 
 * Endpoint: /.netlify/functions/wanikani-proxy
 * Method: GET
 * Query Parameters:
 *   - endpoint: The API endpoint (default: /subjects)
 *   - levels: Comma-separated list of levels (e.g., "1,2,3")
 *   - types: Types to fetch (default: vocabulary)
 *   - hidden: Include hidden items (default: false)
 *   - limit: Number of items to fetch (default: 1000)
 */

const WANIKANI_API_BASE = 'https://api.wanikani.com/v2';
const API_TOKEN = process.env.NEXT_PUBLIC_WANIKANI_API_TOKEN || 'db0708c2-d1d4-4865-948c-b31c9ebdc04e';

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper function to create cache key
function getCacheKey(params) {
  return JSON.stringify(params);
}

// Helper function to delay execution
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry logic with exponential backoff
async function fetchWithRetry(url, options, maxRetries = 3) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.get(url, options);
      return response;
    } catch (error) {
      lastError = error;
      
      // If it's a 503 error, retry with exponential backoff
      if (error.response && error.response.status === 503) {
        const delayMs = Math.min(1000 * Math.pow(2, i), 5000); // Max 5 seconds
        console.log(`[WaniKani Proxy] Got 503, retrying in ${delayMs}ms (attempt ${i + 1}/${maxRetries})`);
        await delay(delayMs);
        continue;
      }
      
      // For network errors, also retry
      if (!error.response) {
        const delayMs = Math.min(1000 * Math.pow(2, i), 5000);
        console.error(`[WaniKani Proxy] Network error, retrying in ${delayMs}ms:`, error.message);
        await delay(delayMs);
        continue;
      }
      
      // For other errors, don't retry
      throw error;
    }
  }
  
  throw lastError;
}

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Extract query parameters
    const {
      endpoint = '/subjects',
      levels,
      types = 'vocabulary',
      hidden = 'false',
      limit = '1000'
    } = event.queryStringParameters || {};

    // Create cache key
    const cacheKey = getCacheKey({ endpoint, levels, types, hidden, limit });
    
    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('[WaniKani Proxy] Cache hit for:', cacheKey.substring(0, 50) + '...');
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'X-Cache': 'HIT',
          'Cache-Control': 'public, max-age=300'
        },
        body: JSON.stringify(cached.data)
      };
    }

    // Build URL
    const url = `${WANIKANI_API_BASE}${endpoint}`;
    const params = {};
    
    if (levels) params.levels = levels;
    if (types) params.types = types;
    if (hidden) params.hidden = hidden;
    if (limit) params.limit = limit;

    console.log('[WaniKani Proxy] Fetching:', url, 'with params:', params);

    // Make request to WaniKani API with retry logic
    const response = await fetchWithRetry(url, {
      params,
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Wanikani-Revision': '20170710',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'DoshiSensei/1.0'
      },
      timeout: 15000 // 15 second timeout
    });

    console.log(`[WaniKani Proxy] Success: ${response.data?.data?.length || 0} items fetched`);

    // Cache the successful response
    cache.set(cacheKey, {
      data: response.data,
      timestamp: Date.now()
    });

    // Clean up old cache entries if cache gets too big
    if (cache.size > 100) {
      const now = Date.now();
      for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          cache.delete(key);
        }
      }
    }

    // Return the WaniKani API response
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'X-Cache': 'MISS',
        'Cache-Control': 'public, max-age=300'
      },
      body: JSON.stringify(response.data)
    };

  } catch (error) {
    console.error('[WaniKani Proxy] Error:', error.message);

    // Handle different error types
    if (error.response) {
      // The request was made and the server responded with an error status
      const status = error.response.status;
      let errorMessage = 'WaniKani API error';
      
      if (status === 401) {
        errorMessage = 'Invalid API token';
      } else if (status === 404) {
        errorMessage = 'Endpoint not found';
      } else if (status === 503) {
        errorMessage = 'WaniKani API is temporarily unavailable';
      } else if (status === 429) {
        errorMessage = 'Rate limit exceeded';
      }
      
      return {
        statusCode: status,
        headers,
        body: JSON.stringify({
          error: errorMessage,
          message: error.response.data?.message || error.message,
          status: status
        })
      };
    } else if (error.request) {
      // The request was made but no response was received
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({
          error: 'Service unavailable',
          message: 'Could not reach WaniKani API'
        })
      };
    } else {
      // Something happened in setting up the request
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Internal server error',
          message: error.message
        })
      };
    }
  }
};