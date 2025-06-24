exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight successful' }),
    };
  }

  try {
    console.log('🚀 Simple scraping function triggered');
    
    // Mock article data for testing
    const mockArticles = [
      {
        id: 'mock_001',
        title: '日本の四季',
        content: '日本には美しい四季があります。春は桜、夏は祭り、秋は紅葉、冬は雪です。',
        summary: '日本の四季について',
        url: 'https://example.com/seasons',
        publishDate: new Date().toISOString(),
        scrapedAt: new Date().toISOString(),
        source: {
          id: 'watanoc',
          name: 'Watanoc',
          displayName: 'Watanoc - Japanese Learning Articles'
        },
        category: 'culture',
        tags: ['seasons', 'nature'],
        difficulty: 'N5',
        estimatedReadingTime: 2,
        vocabulary: [],
        kanji: []
      }
    ];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Mock scraping successful - Firebase not used',
        articlesCount: mockArticles.length,
        articles: mockArticles,
        timestamp: new Date().toISOString()
      }),
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }),
    };
  }
};