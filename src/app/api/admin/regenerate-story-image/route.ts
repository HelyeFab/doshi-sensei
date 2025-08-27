import { NextRequest, NextResponse } from 'next/server';
import { withFirebaseAdmin } from '@/utils/api-wrapper';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 30;

export const POST = withFirebaseAdmin(async (request: NextRequest) => {

  try {
    if (!process.env.OPEN_AI_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured' 
      }, { status: 500 });
    }

    const { 
      pageNumber,
      imagePrompt,
      characterName,
      characterDescription,
      visualStyle = 'anime illustration style',
      modelSheetUrl,
      characterId,
      sessionId
    } = await request.json();

    if (!imagePrompt || !pageNumber) {
      return NextResponse.json({ 
        error: 'Image prompt and page number are required' 
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

    // Build the final prompt with character consistency using ID
    let finalPrompt = '';
    
    if (characterDescription && characterName) {
      // Include character ID for reference if available
      const characterRef = characterId ? `[CHARACTER REF: ${characterId}]` : '';
      
      // Build the prompt with character reference
      finalPrompt = `${characterRef} ${visualStyle}. ${characterName}: ${characterDescription}. Scene: ${imagePrompt}`;
      
      // If we have a model sheet and character ID, use specific reference
      if (modelSheetUrl && characterId) {
        finalPrompt = `[CONTINUE CHARACTER ${characterId}] IMPORTANT: Draw the EXACT SAME character from the model sheet. ${finalPrompt}. The character MUST match the reference sheet exactly.`;
      } else if (modelSheetUrl) {
        finalPrompt = `IMPORTANT: Draw the EXACT SAME character from the model sheet. ${finalPrompt}. The character MUST look identical to the reference.`;
      }
    } else {
      // Fallback to just the prompt with style
      finalPrompt = `${visualStyle}. ${imagePrompt}`;
    }

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: finalPrompt,
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
      imageUrl: imageUrl,
      revisedPrompt: revisedPrompt,
      originalPrompt: imagePrompt,
      finalPrompt: finalPrompt
    });

  } catch (error: any) {
    console.error('Error regenerating image:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to regenerate image',
        details: error.stack
      },
      { status: 500 }
    );
  }
});