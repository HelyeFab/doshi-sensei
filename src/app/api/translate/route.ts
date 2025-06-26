import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, source_lang = 'JA', target_lang = 'EN' } = body;

    if (!text) {
      return NextResponse.json(
        { success: false, error: 'Text is required' },
        { status: 400 }
      );
    }

    // Try server-side first (secure), fallback to client-side (for development)
    const apiKey = process.env.DEEPL_API_KEY || process.env.NEXT_PUBLIC_DEEPL_API_KEY;
    if (!apiKey) {
      console.error('❌ DeepL API key not configured');
      return NextResponse.json(
        {
          success: false,
          error: 'Translation service not configured',
          fallback: true
        },
        { status: 500 }
      );
    }

    const startTime = Date.now();

    // DeepL API endpoint (use the correct one based on your API key type)
    const apiUrl = apiKey.endsWith(':fx')
      ? 'https://api-free.deepl.com/v2/translate'
      : 'https://api.deepl.com/v2/translate';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text: text,
        source_lang: source_lang,
        target_lang: target_lang,
      }),
    });

    const apiTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ DeepL API error:', response.status, errorText);

      return NextResponse.json(
        {
          success: false,
          error: `DeepL API error: ${response.status}`,
          fallback: true
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.translations && data.translations.length > 0) {
      const translation = data.translations[0];

      return NextResponse.json({
        success: true,
        translation: translation.text,
        detected_language: translation.detected_source_language,
        confidence: 1.0, // DeepL doesn't provide confidence scores
      });
    } else {
      console.error('❌ DeepL API returned no translations');
      return NextResponse.json(
        {
          success: false,
          error: 'No translation returned',
          fallback: true
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ DeepL translation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Translation service error',
        fallback: true
      },
      { status: 500 }
    );
  }
}
