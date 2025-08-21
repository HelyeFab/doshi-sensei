import { NextRequest, NextResponse } from 'next/server';
import { withFirebaseAdmin } from '@/utils/api-wrapper';
import OpenAI from 'openai';
import { JLPTLevel } from '@/types/kanji';

// Configure for API route timeout
export const runtime = 'nodejs';
export const maxDuration = 30; // 30 seconds for outline generation

// JLPT level guidelines - simplified for outline
const JLPT_GUIDELINES: Record<JLPTLevel, string> = {
  N5: 'Very simple story. Basic events only.',
  N4: 'Simple story with clear sequence.',
  N3: 'Moderate complexity allowed.',
  N2: 'More complex plot allowed.',
  N1: 'Full complexity allowed.',
};

interface GenerateOutlineRequest {
  theme: string;
  jlptLevel: JLPTLevel;
  pages: number;
  characterSheet: any;
}

export const POST = withFirebaseAdmin(async (request: NextRequest) => {

  try {
    if (!process.env.OPEN_AI_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured' 
      }, { status: 500 });
    }

    // Initialize OpenAI with shorter timeout
    const openai = new OpenAI({
      apiKey: process.env.OPEN_AI_API_KEY,
      timeout: 20000, // 20 second timeout
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
    const isAdmin = decodedToken.admin === true || decodedToken.email === 'emmanuelfabiani23@gmail.com';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body: GenerateOutlineRequest = await request.json();
    const { theme, jlptLevel, pages, characterSheet } = body;

    // Validate inputs
    if (!theme || !jlptLevel || !pages || !characterSheet) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Ultra-light outline prompt with DALL-E friendly image descriptions
    const outlinePrompt = `Create a ${pages}-page outline for a ${theme} story.
Main character: ${characterSheet.mainCharacter.name}
JLPT ${jlptLevel}: ${JLPT_GUIDELINES[jlptLevel]}

Return JSON array with ${pages} items:
[
  {
    "pageNumber": 1,
    "summary": "One sentence about what happens",
    "imagePrompt": "A child in a classroom setting"
  }
]

IMPORTANT for imagePrompt:
- Use generic terms like "child", "student", "teacher" instead of names
- Keep very simple: "A child reading a book in a library"
- Avoid complex scenes or specific actions
- Focus on settings and simple activities

Keep summaries under 15 words each.`;

    const outlineResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Generate minimal JSON arrays. Be extremely concise.'
        },
        {
          role: 'user',
          content: outlinePrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 200 + (pages * 50), // Scale with page count
      response_format: { type: "json_object" }
    }).catch(error => {
      console.error('OpenAI outline error:', error);
      throw new Error(`Outline generation failed: ${error.message}`);
    });

    let outline = [];
    try {
      const responseContent = outlineResponse.choices[0].message.content || '{"pages": []}';
      const parsed = JSON.parse(responseContent);
      
      // Handle different response formats
      if (Array.isArray(parsed)) {
        outline = parsed;
      } else if (parsed.pages && Array.isArray(parsed.pages)) {
        outline = parsed.pages;
      } else if (parsed.outline && Array.isArray(parsed.outline)) {
        outline = parsed.outline;
      } else {
        // Try to extract any array from the response
        const arrays = Object.values(parsed).filter(Array.isArray);
        outline = arrays[0] || [];
      }
      
      // Ensure we have the right number of pages
      outline = outline.slice(0, pages);
      
    } catch (parseError) {
      console.error('Error parsing outline:', parseError);
      throw new Error('Failed to parse outline response');
    }

    return NextResponse.json({
      success: true,
      outline: outline,
      metadata: {
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error generating outline:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate outline' },
      { status: 500 }
    );
  }
});