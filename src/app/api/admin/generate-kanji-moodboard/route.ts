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
export const maxDuration = 60; // 60 seconds max execution time

export const POST = withFirebaseAdmin(async (request: NextRequest) => {

  let theme: string | undefined;
  let jlptLevel: JLPTLevel | undefined;
  let kanjiCount: number | undefined;
  
  try {
    const apiKey = process.env.OPEN_AI_API_KEY || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error('OpenAI API key is missing');
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const openai = new OpenAI({ 
      apiKey,
      timeout: 50000, // 50 second timeout (less than maxDuration)
      maxRetries: 2
    });

    const body: GenerateMoodboardRequest = await request.json();

    ({ theme, jlptLevel = 'N5', kanjiCount = 15 } = body);
    const { tags = [] } = body;

    if (!theme) {
      console.error('Theme is missing from request');
      return NextResponse.json({ error: 'Theme is required' }, { status: 400 });
    }

    // Generate kanji list using GPT-4
    const systemPrompt = `You are a Japanese language expert creating educational kanji mood boards. Generate a list of kanji related to the given theme.

Rules:
1. Include both common and less common kanji for the theme
2. For family members, include both formal and informal terms (e.g., 兄/お兄さん, 姉/お姉さん)
3. CRITICAL: You MUST include kanji from ${jlptLevel} level specifically, not just N5!
   - For N5: Use only basic kanji (日, 本, 人, 大, 小, etc.)
   - For N4: Include N5 AND N4 kanji (時, 間, 家, 会, 社, etc.)
   - For N3: Include N5, N4 AND N3 kanji (政, 治, 経, 済, etc.)
   - For N2: Include all lower levels AND N2 kanji (複, 雑, 況, 況, etc.)
   - For N1: Include all levels including advanced N1 kanji (璧, 瑞, 凛, etc.)
4. Each kanji should have accurate readings and meanings
5. Provide stroke count and relevant tags
6. Generate exactly ${kanjiCount} kanji entries
7. IMPORTANT: Each kanji character must be unique - no duplicates allowed
8. IMPORTANT: The majority of kanji should be from the ${jlptLevel} level, with some from lower levels for context

Return ONLY valid JSON in this exact format:
{
  "title": "Theme Name in English",
  "description": "Brief description of the theme",
  "themeColor": "#hexcolor",
  "emoji": "appropriate emoji",
  "kanjiList": [
    {
      "kanji": "漢字",
      "meaning": "English meaning",
      "onyomi": ["カンジ", "ダイ"],
      "kunyomi": ["から"],
      "jlptLevel": "N5",
      "strokeCount": 13,
      "tags": ["tag1", "tag2"],
      "examples": [
        "赤い花が咲いています。",
        "赤ちゃんは元気です。"
      ]
    }
  ]
}

IMPORTANT: 
- onyomi must be an array of katakana readings (e.g., ["シ", "ス"])
- kunyomi must be an array of hiragana readings (e.g., ["こ"])
- If there are no on'yomi readings, use empty array []
- If there are no kun'yomi readings, use empty array []
- examples must be an array of exactly 2 Japanese sentences that use the kanji
- Keep example sentences simple and appropriate for the JLPT level

For family members, include variations like:
- 父 (ちち, father - informal)
- お父さん (おとうさん, father - formal)
- 兄 (あに, older brother - informal)
- お兄さん (おにいさん, older brother - formal)

For manga/anime/hero themes, focus on:
- Character traits (勇 brave, 強 strong, 正 justice)
- Action/battle related kanji (戦 battle, 技 technique, 力 power)
- Hero attributes (英 hero, 雄 masculine/hero, 侍 samurai)
- Common manga terminology

For Pokemon/character names, focus on:
- Kanji used in actual Pokemon names (like 雷 thunder for Raichu, 夢 dream for Munna)
- NOT Pokemon types, but kanji that appear in Pokemon character names
- Examples of kanji from Pokemon names:
  • ピカチュウ (Pikachu) - 光 (light/pika) 電 (electricity)
  • フシギダネ (Bulbasaur) - 不思議 (mysterious) 種 (seed)
  • ヒトカゲ (Charmander) - 火 (fire) 蜥 (lizard)
  • ゼニガメ (Squirtle) - 銭 (coin) 亀 (turtle)
  • コダック (Psyduck) - 子 (child) 鴨 (duck)
  • プリン (Jigglypuff) - プリン (pudding/flan)
  • カビゴン (Kabuto) - 兜 (helmet/kabuto)
  • ミュウツー (Mewtwo) - 夢 (dream) 二 (two)

For all kanji, include proper on'yomi (katakana) and kun'yomi (hiragana) readings as arrays.`;

    let themeGuidance = '';
    
    if (theme.toLowerCase().includes('pokemon') && theme.toLowerCase().includes('name')) {
      themeGuidance = 'IMPORTANT: Include kanji that appear in actual Pokemon character names (not types). Examples: 雷 (thunder) from Raichu, 夢 (dream) from Munna, 不思議 (mysterious) from Fushigidane, 種 (seed) from Fushigidane, etc.';
    } else if (theme.toLowerCase().includes('manga') || theme.toLowerCase().includes('hero')) {
      themeGuidance = 'Include kanji commonly used in manga/anime for heroes, battles, and character traits.';
    }
    
    const userPrompt = `Generate a kanji mood board for the theme: "${theme}"
${tags.length > 0 ? `Include these tags where relevant: ${tags.join(', ')}` : ''}
IMPORTANT: You MUST include kanji from ${jlptLevel} level, not just N5! 
- If ${jlptLevel} is N4, include N4 level kanji (not just N5)
- If ${jlptLevel} is N3, include N3 level kanji (not just N5/N4)
- If ${jlptLevel} is N2, include N2 level kanji 
- If ${jlptLevel} is N1, include N1 level kanji
Mix kanji from ${jlptLevel} and lower levels appropriately.
${themeGuidance}`;

    const startTime = Date.now();
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
      max_tokens: 4000 // Ensure enough tokens for 20 kanji
    });
    
    const apiDuration = Date.now() - startTime;

    const generatedContent = completion.choices[0].message.content;
    if (!generatedContent) {
      throw new Error('No content generated');
    }

    const moodboardData = JSON.parse(generatedContent);

    // Validate the generated data
    if (!moodboardData.kanjiList || !Array.isArray(moodboardData.kanjiList)) {
      throw new Error('Invalid response format');
    }

    // Ensure all kanji have required fields and remove duplicates
    const seenKanji = new Set<string>();
    const uniqueKanjiList: any[] = [];
    let hasRequestedLevel = false;
    
    for (const kanji of moodboardData.kanjiList) {
      const char = kanji.kanji || '';
      if (char && !seenKanji.has(char)) {
        seenKanji.add(char);
        const kanjiLevel = kanji.jlptLevel || jlptLevel;
        
        // Check if we have at least some kanji from the requested level
        if (kanjiLevel === jlptLevel) {
          hasRequestedLevel = true;
        }
        
        uniqueKanjiList.push({
          kanji: char,
          meaning: kanji.meaning || '',
          onyomi: kanji.onyomi || [],
          kunyomi: kanji.kunyomi || [],
          jlptLevel: kanjiLevel,
          examples: kanji.examples || [],
          strokeCount: kanji.strokeCount || 1,
          tags: kanji.tags || []
        });
      }
    }
    
    // Log warning if no kanji from requested level were generated
    if (!hasRequestedLevel && jlptLevel !== 'N5') {
      console.warn(`Warning: No ${jlptLevel} kanji were generated for theme "${theme}". All kanji appear to be from lower levels.`);
    }
    
    moodboardData.kanjiList = uniqueKanjiList;

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
      response: error?.response?.data,
      theme: theme,
      jlptLevel: jlptLevel,
      kanjiCount: kanjiCount
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
        { error: `Request timeout - Generating ${kanjiCount} kanji took too long. Try reducing the number of kanji.` },
        { status: 500 }
      );
    }
    
    if (error?.message?.includes('rate limit')) {
      return NextResponse.json(
        { error: 'OpenAI rate limit exceeded. Please try again in a few seconds.' },
        { status: 429 }
      );
    }
    
    // For manga heroes specifically, provide a helpful message
    if (theme && (theme.toLowerCase().includes('manga') || theme.toLowerCase().includes('hero'))) {
      return NextResponse.json(
        { error: `Failed to generate manga/hero kanji. The theme might be too specific. Try "action characters" or "warrior kanji" instead.` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate moodboard. Please try with fewer kanji or a simpler theme.' },
      { status: 500 }
    );
  }
});