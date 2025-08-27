import { NextRequest, NextResponse } from 'next/server';
import { withFirebaseAdmin } from '@/utils/api-wrapper';
import OpenAI from 'openai';
import { generateCharacterProfile, generateCharacterSheetPrompt } from '@/utils/character-consistency';
import type { AICharacterSheet } from '@/types/ai-story';

export const runtime = 'nodejs';
export const maxDuration = 60;

export const POST = withFirebaseAdmin(async (request: NextRequest) => {

  try {
    if (!process.env.OPEN_AI_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured' 
      }, { status: 500 });
    }

    // Get request body
    const { character, visualStyle = 'anime illustration style' } = await request.json();
    
    if (!character || !character.name) {
      return NextResponse.json({ 
        error: 'Character data is required' 
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
    const adminEmail = process.env.ADMIN_EMAIL;
    const isAdmin = decodedToken.admin === true || (adminEmail && decodedToken.email === adminEmail);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPEN_AI_API_KEY,
    });

    // Generate character profile with session ID for consistency
    const sessionId = Date.now().toString();
    const characterProfile = generateCharacterProfile(
      character as AICharacterSheet['mainCharacter'],
      visualStyle,
      { sessionId }
    );

    // Generate character model sheet prompt
    const modelSheetPrompt = generateCharacterSheetPrompt(characterProfile);

    try {
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: modelSheetPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        style: 'vivid',
        response_format: 'url'
      });

      const imageUrl = response.data?.[0]?.url;
      const revisedPrompt = response.data?.[0]?.revised_prompt;

      if (!imageUrl) {
        throw new Error('No image URL returned from OpenAI');
      }

      return NextResponse.json({
        success: true,
        characterProfile: characterProfile,
        modelSheet: {
          imageUrl: imageUrl,
          prompt: modelSheetPrompt,
          revisedPrompt: revisedPrompt
        },
        sessionId: sessionId
      });

    } catch (openaiError: any) {
      console.error('OpenAI error generating model sheet:', openaiError);
      
      // Return partial success with character profile but no image
      return NextResponse.json({
        success: false,
        characterProfile: characterProfile,
        sessionId: sessionId,
        error: openaiError.message || 'Failed to generate model sheet image',
        fallbackToText: true
      });
    }

  } catch (error: any) {
    console.error('Error in model sheet generation:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Model sheet generation failed',
        details: error.stack
      },
      { status: 500 }
    );
  }
});