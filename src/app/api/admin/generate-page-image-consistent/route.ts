import { NextRequest, NextResponse } from 'next/server';
import { withFirebaseAdmin } from '@/utils/api-wrapper';
import OpenAI from 'openai';
// Removed Gemini import - using OpenAI only

export const runtime = 'nodejs';
export const maxDuration = 60;

export const POST = withFirebaseAdmin(async (request: NextRequest) => {
  console.log('Generate consistent page image endpoint called');
  
  try {
    const { 
      pageNumber,
      imagePrompt,
      characterDescription,
      characterName,
      visualStyle = 'anime illustration style',
      modelSheetUrl,
      characterId,
      sessionId,
      useGemini = false
    } = await request.json();

    if (!imagePrompt) {
      return NextResponse.json({ 
        error: 'Image prompt is required' 
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

    // Check if OpenAI is available
    if (!process.env.OPEN_AI_API_KEY) {
      return NextResponse.json({
        error: 'OpenAI API key not configured',
        details: 'Please add OPEN_AI_API_KEY to your environment variables'
      }, { status: 500 });
    }

    // Use OpenAI with simplified character consistency
    const openai = new OpenAI({
      apiKey: process.env.OPEN_AI_API_KEY,
    });

    // Build prompt with character ID reference for consistency
    let finalPrompt = '';
    
    if (characterDescription && characterName) {
      // Include character ID for reference if available
      const characterRef = characterId ? `[CHARACTER REF: ${characterId}]` : '';
      
      // Build the prompt with character reference
      finalPrompt = `${characterRef} ${visualStyle}. ${characterName}: ${characterDescription}. Scene: ${imagePrompt}`;
      
      // If we have a model sheet, emphasize consistency with the specific character
      if (modelSheetUrl && characterId) {
        finalPrompt = `[CONTINUE CHARACTER ${characterId}] IMPORTANT: Draw the EXACT SAME character from the model sheet. ${finalPrompt}. The character MUST match the reference sheet exactly.`;
      } else if (modelSheetUrl) {
        finalPrompt = `IMPORTANT: Draw the EXACT SAME character from previous images. ${finalPrompt}. The character MUST look identical to all previous images.`;
      }
    } else {
      // Fallback to original prompt
      finalPrompt = `${visualStyle}. ${imagePrompt}`;
    }

    console.log(`Generating image for page ${pageNumber}`);
    console.log('Prompt:', finalPrompt);

    try {
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
        pageImage: {
          imageUrl: imageUrl,
          imageAlt: imagePrompt,
          revisedPrompt: revisedPrompt,
          provider: 'openai'
        }
      });

    } catch (openaiError: any) {
      console.error('OpenAI error:', openaiError);
      
      return NextResponse.json({
        error: 'Image generation failed',
        details: openaiError.message
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error in page image generation:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Image generation failed',
        details: error.stack
      },
      { status: 500 }
    );
  }
});