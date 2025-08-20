const axios = require('axios');

/**
 * Netlify Function: Jisho API Proxy
 * 
 * This function acts as a proxy for the Jisho.org API to bypass CORS restrictions
 * when calling from the browser. It forwards search requests to the Jisho API
 * and returns the results.
 * 
 * Endpoint: /.netlify/functions/jisho-proxy
 * Method: GET
 * Query Parameters:
 *   - keyword: The search term (required)
 *   - page: The page number for pagination (optional, default: 1)
 */

const JISHO_API_BASE = 'https://jisho.org/api/v1/search/words';

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
    const { keyword, page = '1' } = event.queryStringParameters || {};

    if (!keyword) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required parameter: keyword' })
      };
    }

    console.log(`[Jisho Proxy] Searching for: ${keyword}, page: ${page}`);

    // Make request to Jisho API
    const response = await axios.get(JISHO_API_BASE, {
      params: {
        keyword: keyword,
        page: page
      },
      headers: {
        'User-Agent': 'Doshi-Sensei-App/1.0'
      },
      timeout: 10000 // 10 second timeout
    });

    console.log(`[Jisho Proxy] Found ${response.data?.data?.length || 0} results`);

    // Return the Jisho API response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response.data)
    };

  } catch (error) {
    console.error('[Jisho Proxy] Error:', error.message);

    // Handle different error types
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      return {
        statusCode: error.response.status,
        headers,
        body: JSON.stringify({
          error: 'Jisho API error',
          message: error.response.data?.message || error.message,
          status: error.response.status
        })
      };
    } else if (error.request) {
      // The request was made but no response was received
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({
          error: 'Service unavailable',
          message: 'Could not reach Jisho API'
        })
      };
    } else {
      // Something happened in setting up the request that triggered an Error
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