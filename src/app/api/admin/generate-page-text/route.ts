import { NextRequest, NextResponse } from 'next/server';
import { withFirebaseAdmin } from '@/utils/api-wrapper';
import OpenAI from 'openai';
import { JLPTLevel } from '@/types/kanji';
import { generateFurigana } from '@/utils/furigana';

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
    const adminEmail = process.env.ADMIN_EMAIL;
    const isAdmin = decodedToken.admin === true || (adminEmail && decodedToken.email === adminEmail);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body: GeneratePageTextRequest = await request.json();
    const { pageNumber, pageSummary, theme, jlptLevel, characterName, previousPageSummary } = body;

    // Enhanced text generation prompt for longer, richer stories
    const textPrompt = `Write page ${pageNumber} of a ${theme} story.
Character: ${characterName}
What happens: ${pageSummary}
${previousPageSummary ? `Previous: ${previousPageSummary}` : ''}
JLPT ${jlptLevel}: ${JLPT_GUIDELINES[jlptLevel]}

IMPORTANT: Write a FULL story page with:
- At least 8-10 sentences (250-300 words total)
- Rich descriptions of the setting and character emotions
- Natural dialogue where appropriate
- Smooth story progression
- Engaging narrative that would interest children

Write natural Japanese text without any special formatting.

Return JSON:
{
  "japanese": "full story text in plain Japanese",
  "english": "complete translation"
}`;

    const textResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a skilled children\'s story writer. Write engaging, descriptive story pages that are appropriate for the JLPT level while being interesting and substantial. Each page should feel complete but part of a larger narrative.'
        },
        {
          role: 'user',
          content: textPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000, // Increased for proper story length
      response_format: { type: "json_object" }
    }).catch(error => {
      console.error('OpenAI text generation error:', error);
      throw new Error(`Text generation failed: ${error.message}`);
    });

    const textResult = JSON.parse(textResponse.choices[0].message.content || '{}');
    
    // Apply furigana to the Japanese text
    let processedText = textResult.japanese || '';
    try {

      processedText = await generateFurigana(processedText);

    } catch (furiganaError) {
      console.error('Failed to apply furigana, using plain text:', furiganaError);
      // Continue with plain text if furigana fails
    }

    return NextResponse.json({
      success: true,
      pageText: {
        text: processedText,
        translation: textResult.english || '',
        pageNumber: pageNumber
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        furiganaApplied: processedText !== textResult.japanese
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