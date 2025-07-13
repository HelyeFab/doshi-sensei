import { NextRequest, NextResponse } from 'next/server';
import { withFirebaseAdmin } from '@/utils/api-wrapper';
import OpenAI from 'openai';

// Configure for API route timeout
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for Netlify Functions

export const POST = withFirebaseAdmin(async (request: NextRequest) => {
  console.log('Test OpenAI endpoint called');
  
  try {
    // Get Firebase Admin from request context
    const admin = (request as any).firebaseAdmin;
    
    // Verify admin authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Check if user is admin
    const isAdmin = decodedToken.admin === true || decodedToken.email === 'emmanuelfabiani23@gmail.com';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPEN_AI_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured',
        details: 'OPEN_AI_API_KEY environment variable is not set'
      }, { status: 500 });
    }

    // Initialize OpenAI client with timeout configuration
    const openai = new OpenAI({
      apiKey: process.env.OPEN_AI_API_KEY,
      timeout: 10000, // 10 second timeout for test
      maxRetries: 0, // No retries for test
    });

    console.log('Testing OpenAI API connection...');

    // Simple test call
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: 'Say "Hello from Doshi Sensei!" in Japanese with furigana.'
        }
      ],
      max_tokens: 100,
      temperature: 0
    });

    const content = response.choices[0]?.message?.content || 'No response';
    
    return NextResponse.json({
      success: true,
      message: 'OpenAI API connection successful',
      response: content,
      model: response.model,
      usage: response.usage
    });

  } catch (error: any) {
    console.error('OpenAI test error:', error);
    
    // Detailed error response
    let errorDetails: any = {
      message: error.message,
      type: error.constructor.name,
    };

    if (error.response) {
      errorDetails.status = error.response.status;
      errorDetails.statusText = error.response.statusText;
      errorDetails.data = error.response.data;
    }

    if (error.code) {
      errorDetails.code = error.code;
    }

    return NextResponse.json({
      success: false,
      error: 'OpenAI API test failed',
      details: errorDetails
    }, { status: 500 });
  }
});