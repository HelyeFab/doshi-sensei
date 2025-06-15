// Netlify Function to proxy Jisho API requests and handle CORS
exports.handler = async (event, context) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
      },
      body: '',
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Extract query parameters
    const { keyword, page = 1, tags } = event.queryStringParameters || {};

    if (!keyword) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Keyword parameter is required' }),
      };
    }

    // Build Jisho API URL
    let jishoUrl = `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(keyword)}&page=${page}`;

    if (tags) {
      jishoUrl += `&tags=${encodeURIComponent(tags)}`;
    }

    // Fetch from Jisho API
    const response = await fetch(jishoUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Doshi-Sensei-App/1.0)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Jisho API responded with status: ${response.status}`);
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
      body: JSON.stringify(data),
    };

  } catch (error) {
    console.error('Error proxying Jisho API:', error);

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Failed to fetch from Jisho API',
        message: error.message
      }),
    };
  }
};
