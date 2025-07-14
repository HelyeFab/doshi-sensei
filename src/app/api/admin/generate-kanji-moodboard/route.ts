import { NextRequest, NextResponse } from 'next/server';
import { withFirebaseAdmin } from '@/utils/api-wrapper';
import OpenAI from 'openai';
import { JLPTLevel } from '@/types/kanji';

interface GenerateMoodboardRequest {
  theme: string;
  jlptLevel?: JLPTLevel;
  kanjiCount?: number;
  tags?: string[];
}

// Configure for API route
export const runtime = 'nodejs';
export const maxDuration = 60;

export const POST = withFirebaseAdmin(async (request: NextRequest) => {
  console.log('=== Generate Kanji Moodboard API Called ===');
  
  try {
    const apiKey = process.env.OPEN_AI_API_KEY || process.env.OPENAI_API_KEY;
    
    console.log('API Key check:', {
      OPEN_AI_API_KEY: !!process.env.OPEN_AI_API_KEY,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      hasKey: !!apiKey
    });
    
    if (!apiKey) {
      console.error('OpenAI API key is missing');
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const openai = new OpenAI({ 
      apiKey,
      timeout: 30000, // 30 second timeout
      maxRetries: 1
    });

    const body: GenerateMoodboardRequest = await request.json();
    console.log('Request body:', body);
    
    const { theme, jlptLevel = 'N5', kanjiCount = 15, tags = [] } = body;

    if (!theme) {
      console.error('Theme is missing from request');
      return NextResponse.json({ error: 'Theme is required' }, { status: 400 });
    }
    
    console.log('Generating moodboard for:', { theme, jlptLevel, kanjiCount, tags });

    // Generate kanji list using GPT-4
    const systemPrompt = `You are a Japanese language expert creating educational kanji mood boards. Generate a list of kanji related to the given theme.

Rules:
1. Include both common and less common kanji for the theme
2. For family members, include both formal and informal terms (e.g., 兄/お兄さん, 姉/お姉さん)
3. Include kanji appropriate for ${jlptLevel} level and below
4. Each kanji should have accurate readings and meanings
5. Provide stroke count and relevant tags
6. Generate exactly ${kanjiCount} kanji entries

Return ONLY valid JSON in this exact format:
{
  "title": "Theme Name in English",
  "description": "Brief description of the theme",
  "themeColor": "#hexcolor",
  "emoji": "appropriate emoji",
  "kanjiList": [
    {
      "kanji": "漢字",
      "kana": "primary reading in hiragana",
      "onReading": "カンジ",
      "kunReading": "reading in hiragana if exists",
      "meaning": "English meaning",
      "jlptLevel": "N5",
      "radicals": ["radical1"],
      "strokeCount": 13,
      "tags": ["tag1", "tag2"]
    }
  ]
}

For family members, include variations like:
- 父 (ちち, father - informal)
- お父さん (おとうさん, father - formal)
- 兄 (あに, older brother - informal)
- お兄さん (おにいさん, older brother - formal)`;

    const userPrompt = `Generate a kanji mood board for the theme: "${theme}"
${tags.length > 0 ? `Include these tags where relevant: ${tags.join(', ')}` : ''}
Focus on ${jlptLevel} level and below.`;

    console.log('Calling OpenAI with prompt:', userPrompt);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const generatedContent = completion.choices[0].message.content;
    if (!generatedContent) {
      throw new Error('No content generated');
    }

    console.log('OpenAI response:', generatedContent);
    
    const moodboardData = JSON.parse(generatedContent);

    // Validate the generated data
    if (!moodboardData.kanjiList || !Array.isArray(moodboardData.kanjiList)) {
      throw new Error('Invalid response format');
    }

    // Ensure all kanji have required fields
    moodboardData.kanjiList = moodboardData.kanjiList.map((kanji: any) => ({
      kanji: kanji.kanji || '',
      kana: kanji.kana || '',
      meaning: kanji.meaning || '',
      jlptLevel: kanji.jlptLevel || jlptLevel,
      examples: [], // Empty for now as requested
      radicals: kanji.radicals || [],
      strokeCount: kanji.strokeCount || 1,
      tags: kanji.tags || []
    }));

    // Format the response
    const response = {
      category: moodboardData.title || theme,
      themeColor: moodboardData.themeColor || '#F6C667',
      description: moodboardData.description || `Kanji related to ${theme}`,
      emoji: moodboardData.emoji || '📚',
      kanjiList: moodboardData.kanjiList,
      isActive: true,
      sortOrder: 0
    };

    console.log('Sending response with', response.kanjiList.length, 'kanji');
    
    return NextResponse.json(response);

  } catch (error: any) {
    console.error('=== ERROR in generateKanjiMoodboard ===');
    console.error('Error:', error);
    console.error('Error type:', typeof error);
    console.error('Error details:', {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      status: error?.status,
      response: error?.response?.data
    });
    
    // Check for specific OpenAI errors
    if (error?.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'OpenAI API key is invalid or missing' },
        { status: 500 }
      );
    }
    
    if (error?.message?.includes('model')) {
      return NextResponse.json(
        { error: 'Invalid OpenAI model specified' },
        { status: 500 }
      );
    }
    
    if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      return NextResponse.json(
        { error: 'Request timeout - OpenAI took too long to respond' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate moodboard' },
      { status: 500 }
    );
  }
});