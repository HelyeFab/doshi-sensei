import { NextRequest, NextResponse } from 'next/server';
import { withFirebaseAdmin } from '@/utils/api-wrapper';
import OpenAI from 'openai';
import { JLPTLevel } from '@/types/kanji';

// Configure for API route timeout
export const runtime = 'nodejs';
export const maxDuration = 30; // 30 seconds for text generation

// JLPT level guidelines - simplified
const JLPT_GUIDELINES: Record<JLPTLevel, string> = {
  N5: 'Use only basic vocabulary. Simple sentences. Max 10 words per sentence.',
  N4: 'Elementary vocabulary. Sentences up to 15 words.',
  N3: 'Intermediate vocabulary. Sentences up to 20 words.',
  N2: 'Upper-intermediate vocabulary. Natural flowing text.',
  N1: 'Advanced vocabulary. No restrictions.',
};

interface GeneratePageTextRequest {
  pageNumber: number;
  pageSummary: string;
  theme: string;
  jlptLevel: JLPTLevel;
  characterName: string;
  previousPageSummary?: string; // Just the summary, not full text
}

export const POST = withFirebaseAdmin(async (request: NextRequest) => {
  console.log('Generate page text endpoint called');
  try {
    if (!process.env.OPEN_AI_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured' 
      }, { status: 500 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPEN_AI_API_KEY,
      timeout: 20000, // 20 second timeout
      maxRetries: 1,
    });

    // Get Firebase Admin and verify auth
    const admin = (request as any).firebaseAdmin;
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const isAdmin = decodedToken.admin === true || decodedToken.email === 'emmanuelfabiani23@gmail.com';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body: GeneratePageTextRequest = await request.json();
    const { pageNumber, pageSummary, theme, jlptLevel, characterName, previousPageSummary } = body;

    // Ultra-light text generation prompt
    const textPrompt = `Write page ${pageNumber} of a ${theme} story.
Character: ${characterName}
What happens: ${pageSummary}
${previousPageSummary ? `Previous: ${previousPageSummary}` : ''}
JLPT ${jlptLevel}: ${JLPT_GUIDELINES[jlptLevel]}

Write exactly 3-4 sentences in Japanese with furigana.
Format: <ruby>漢字<rt>かんじ</rt></ruby>

Return JSON:
{
  "japanese": "text with ruby tags",
  "english": "translation"
}`;

    console.log(`Generating text for page ${pageNumber}...`);

    const textResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Write very short story pages. 3-4 sentences only. Use simple language.'
        },
        {
          role: 'user',
          content: textPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 400, // Limited for short text
      response_format: { type: "json_object" }
    }).catch(error => {
      console.error('OpenAI text generation error:', error);
      throw new Error(`Text generation failed: ${error.message}`);
    });

    const textResult = JSON.parse(textResponse.choices[0].message.content || '{}');

    return NextResponse.json({
      success: true,
      pageText: {
        text: textResult.japanese || '',
        translation: textResult.english || '',
        pageNumber: pageNumber
      },
      metadata: {
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error generating page text:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate page text' },
      { status: 500 }
    );
  }
});