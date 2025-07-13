import { NextRequest, NextResponse } from 'next/server';
import { withFirebaseAdmin } from '@/utils/api-wrapper';
import OpenAI from 'openai';
import { JLPTLevel } from '@/types/kanji';

// Configure for API route timeout
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for Netlify Functions

// JLPT level guidelines (same as in generate-story)
const JLPT_GUIDELINES: Record<JLPTLevel, string> = {
  N5: 'Use only basic vocabulary and simple sentence structures. Present tense mainly, very simple past tense. Basic particles (は、が、を、に、で、と、も、の). Maximum 10-15 words per sentence.',
  N4: 'Use elementary vocabulary and grammar. Can use past tense, て-form, basic adjective conjugations. Sentences up to 15-20 words.',
  N3: 'Use intermediate vocabulary and grammar. Can use passive, causative, conditional forms. More complex sentence structures. Sentences up to 20-25 words.',
  N2: 'Use upper-intermediate vocabulary and grammar. Complex sentence patterns, keigo, nuanced expressions. Natural flowing text.',
  N1: 'Use advanced vocabulary and grammar. Literary expressions, complex kanji, sophisticated sentence structures. No restrictions.',
};

interface GeneratePageRequest {
  pageNumber: number;
  pageSummary: string;
  imagePrompt: string;
  previousPages?: Array<{
    text: string;
    translation: string;
  }>;
  characterSheet: any;
  theme: string;
  jlptLevel: JLPTLevel;
  regenerateText?: boolean;
  regenerateImage?: boolean;
}

export const POST = withFirebaseAdmin(async (request: NextRequest) => {
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

    const body: GeneratePageRequest = await request.json();
    const { 
      pageNumber, 
      pageSummary, 
      imagePrompt,
      previousPages = [],
      characterSheet,
      theme,
      jlptLevel,
      regenerateText = true,
      regenerateImage = true
    } = body;

    let pageText = '';
    let pageTranslation = '';
    let imageUrl = '';

    // Initialize OpenAI client with timeout configuration
    const openai = new OpenAI({
      apiKey: process.env.OPEN_AI_API_KEY,
      timeout: 50000, // 50 second timeout (under Netlify's 60s limit)
      maxRetries: 1, // Retry once on failure
    });

    // Generate Japanese text and English translation
    if (regenerateText) {
      const storyContext = previousPages.length > 0 
        ? `Story so far:\n${previousPages.map((p, i) => `Page ${i + 1}: ${p.translation}`).join('\n')}\n\n`
        : '';

      const textPrompt = `
Write page ${pageNumber} of a Japanese story for JLPT ${jlptLevel} learners.
Theme: ${theme}
Characters: ${JSON.stringify(characterSheet)}

${storyContext}

This page should:
${pageSummary}

Requirements:
1. Write 200-300 words in Japanese
2. Use furigana with <ruby> tags for all kanji: <ruby>漢字<rt>かんじ</rt></ruby>
3. Follow JLPT ${jlptLevel} guidelines: ${JLPT_GUIDELINES[jlptLevel]}
4. Natural, engaging storytelling
5. Educational value for language learners

Format response as JSON:
{
  "japanese": "full text with ruby tags",
  "english": "natural English translation"
}
`;

      const textResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Using GPT-4o-mini for better quality and speed
        messages: [
          {
            role: 'system',
            content: 'You are an expert Japanese language educator and storyteller. Write engaging, educational stories with proper furigana markup.'
          },
          {
            role: 'user',
            content: textPrompt
          }
        ],
        temperature: 0.7
      }).catch(error => {
        console.error('OpenAI text generation error:', error);
        throw error;
      });

      const textResult = JSON.parse(textResponse.choices[0].message.content || '{}');
      pageText = textResult.japanese || '';
      pageTranslation = textResult.english || '';
    }

    // Generate image with DALL-E
    if (regenerateImage) {
      const characterDescriptions = [
        `${characterSheet.mainCharacter.name}: ${characterSheet.mainCharacter.visualDescription}`,
        ...characterSheet.supportingCharacters.map((c: any) => 
          `${c.name}: ${c.visualDescription}`
        )
      ].join('\n');

      const dallePrompt = `
${imagePrompt}

Visual style: ${characterSheet.visualStyle}
Setting: ${characterSheet.setting.location}, ${characterSheet.setting.atmosphere}

Character appearances:
${characterDescriptions}

IMPORTANT: Keep consistent character appearances and style across all images. Safe for all ages.
`;

      try {
        const imageResponse = await openai.images.generate({
          model: 'dall-e-3',
          prompt: dallePrompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
          style: 'vivid'
        });

        imageUrl = imageResponse.data[0]?.url || '';
      } catch (imageError: any) {
        console.error('Error generating image:', imageError);
        // Continue without image if generation fails
      }
    }

    return NextResponse.json({
      success: true,
      page: {
        pageNumber,
        text: pageText,
        translation: pageTranslation,
        imageUrl,
        imageAlt: imagePrompt,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error generating story page:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate story page' },
      { status: 500 }
    );
  }
});