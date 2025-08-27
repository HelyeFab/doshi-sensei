import { NextRequest, NextResponse } from 'next/server';
import { withFirebaseAdmin } from '@/utils/api-wrapper';
import OpenAI from 'openai';
import { JLPTLevel } from '@/types/kanji';

// Initialize OpenAI client
if (!process.env.OPEN_AI_API_KEY) {
  console.error('OPEN_AI_API_KEY is not set in environment variables');
}

// Content safety guidelines
const CONTENT_GUIDELINES = `
IMPORTANT CONTENT GUIDELINES:
- NO sexual content or innuendo
- NO violence or graphic descriptions
- NO racial, gender, or cultural stereotypes
- NO political or controversial topics
- NO religious content
- Focus on educational, wholesome, and culturally respectful content
- Suitable for all ages
`;

// JLPT level guidelines
const JLPT_GUIDELINES: Record<JLPTLevel, string> = {
  N5: 'Use only basic vocabulary and simple sentence structures. Present tense mainly, very simple past tense. Basic particles (は、が、を、に、で、と、も、の). Maximum 10-15 words per sentence.',
  N4: 'Use elementary vocabulary and grammar. Can use past tense, て-form, basic adjective conjugations. Sentences up to 15-20 words.',
  N3: 'Use intermediate vocabulary and grammar. Can use passive, causative, conditional forms. More complex sentence structures. Sentences up to 20-25 words.',
  N2: 'Use upper-intermediate vocabulary and grammar. Complex sentence patterns, keigo, nuanced expressions. Natural flowing text.',
  N1: 'Use advanced vocabulary and grammar. Literary expressions, complex kanji, sophisticated sentence structures. No restrictions.',
};

interface GenerateStoryRequest {
  theme: string;
  jlptLevel: JLPTLevel;
  pages: number;
  characterSheet?: {
    mainCharacter: string;
    supportingCharacters: string[];
    setting: string;
    visualStyle: string;
  };
}

interface CharacterSheet {
  mainCharacter: {
    name: string;
    nameJa: string;
    description: string;
    visualDescription: string;
  };
  supportingCharacters: Array<{
    name: string;
    nameJa: string;
    description: string;
    visualDescription: string;
  }>;
  setting: {
    location: string;
    time: string;
    atmosphere: string;
  };
  visualStyle: string;
}

// Configure for API route timeout (must be less than 45 seconds for OpenAI)
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for Netlify Functions

// MODIFIED: This endpoint now ONLY generates character sheets
// Outline generation moved to separate endpoint for better timeout handling
export const POST = withFirebaseAdmin(async (request: NextRequest) => {

  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPEN_AI_API_KEY) {
      console.error('OPEN_AI_API_KEY is not configured');
      return NextResponse.json({ 
        error: 'OpenAI API key not configured. Please add OPEN_AI_API_KEY to your .env file.' 
      }, { status: 500 });
    }

    // Initialize OpenAI client with shorter timeout for character generation only
    const openai = new OpenAI({
      apiKey: process.env.OPEN_AI_API_KEY,
      timeout: 20000, // 20 second timeout for character generation only
      maxRetries: 1,
    });

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
    const adminEmail = process.env.ADMIN_EMAIL;
    const isAdmin = decodedToken.admin === true || (adminEmail && decodedToken.email === adminEmail);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body: GenerateStoryRequest = await request.json();
    const { theme, jlptLevel, pages, characterSheet } = body;

    // Validate inputs
    if (!theme || !jlptLevel || !pages) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (pages < 1 || pages > 10) {
      return NextResponse.json({ error: 'Pages must be between 1 and 10' }, { status: 400 });
    }

    // Generate or use existing character sheet
    let characters: CharacterSheet;
    
    if (characterSheet && characterSheet.mainCharacter && typeof characterSheet.mainCharacter === 'object') {
      characters = characterSheet as any as CharacterSheet;
    } else {
      // Ultra-light character generation prompt
      const lightCharacterPrompt = `Create a main character and 1 supporting character for a ${theme} story.
Return minimal JSON:
{
  "mainCharacter": {
    "name": "Name",
    "nameJa": "<ruby>名前<rt>なまえ</rt></ruby>",
    "description": "young student",
    "visualDescription": "child with black hair"
  },
  "supportingCharacters": [{
    "name": "Friend",
    "nameJa": "<ruby>友達<rt>ともだち</rt></ruby>",
    "description": "classmate",
    "visualDescription": "child with brown hair"
  }],
  "setting": {
    "location": "school",
    "time": "morning",
    "atmosphere": "cheerful"
  },
  "visualStyle": "simple anime style"
}`;

      const characterResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Generate minimal JSON only. Be extremely concise.'
          },
          {
            role: 'user',
            content: lightCharacterPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 300, // Further reduced
        response_format: { type: "json_object" }
      }).catch(error => {
        console.error('OpenAI API error:', error);
        throw new Error(`Character generation failed: ${error.message}`);
      });

      try {
        characters = JSON.parse(characterResponse.choices[0].message.content || '{}');
      } catch (parseError) {
        console.error('Error parsing character response:', parseError);
        throw new Error('Failed to parse character generation response');
      }
    }

    // Return ONLY the character sheet - outline will be generated separately
    return NextResponse.json({
      success: true,
      characterSheet: characters,
      metadata: {
        theme,
        jlptLevel,
        pages,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error generating characters:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate characters' },
      { status: 500 }
    );
  }
});