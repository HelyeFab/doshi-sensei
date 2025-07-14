import { NextRequest, NextResponse } from 'next/server';
import { withFirebaseAdmin } from '@/utils/api-wrapper';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 30;

export const POST = withFirebaseAdmin(async (request: NextRequest) => {
  console.log('Generate image prompt endpoint called');
  
  try {
    if (!process.env.OPEN_AI_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured' 
      }, { status: 500 });
    }

    const { 
      pageText,
      pageTranslation,
      pageNumber,
      characterName,
      characterDescription,
      theme,
      setting
    } = await request.json();

    if (!pageText || !pageNumber) {
      return NextResponse.json({ 
        error: 'Page text and number are required' 
      }, { status: 400 });
    }

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

    const openai = new OpenAI({
      apiKey: process.env.OPEN_AI_API_KEY,
    });

    // Create a prompt to generate an image prompt based on the actual story text
    const systemPrompt = `You are an expert at creating detailed image prompts for children's story illustrations. 
Given the story text, create a comprehensive image prompt that:
1. ALWAYS starts with the character's name and full physical description
2. Describes the specific action or emotion in detail
3. Includes detailed background and setting descriptions
4. Mentions lighting, atmosphere, and mood
5. Adds relevant environmental details (objects, nature, weather)
6. Is vivid and descriptive while appropriate for children

The prompt should be 2-3 sentences long and paint a complete picture.
Return ONLY the image prompt, no explanations.`;

    const userPrompt = `Story text: ${pageText}
Translation: ${pageTranslation || 'N/A'}
Character: ${characterName} (${characterDescription})
Theme: ${theme}
Setting: ${setting || 'Japan'}
Page number: ${pageNumber}

Create a detailed, descriptive image prompt that MUST include the character's full description.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 300  // Increased to allow for more detailed prompts
    });

    const imagePrompt = completion.choices[0]?.message?.content?.trim() || '';

    if (!imagePrompt) {
      throw new Error('Failed to generate image prompt');
    }

    console.log(`Generated image prompt for page ${pageNumber}:`, imagePrompt);

    return NextResponse.json({
      success: true,
      imagePrompt: imagePrompt
    });

  } catch (error: any) {
    console.error('Error generating image prompt:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to generate image prompt',
        details: error.stack
      },
      { status: 500 }
    );
  }
});