import { NextRequest, NextResponse } from 'next/server';
import { withFirebaseAdmin } from '@/utils/api-wrapper';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateImageWithGPTImage, generateImageWithDALLE3 } from '@/utils/openai-image-generation';
import { generateCharacterProfile, generateConsistentCharacterPrompt, CharacterVisualProfile } from '@/utils/character-consistency';

// Configure for API route timeout
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for image generation on Netlify Functions

interface GeneratePageImageRequest {
  pageNumber: number;
  imagePrompt: string;
  characterDescription: string;
  visualStyle: string;
  setting: string;
  characterReferenceImage?: string; // Reference image for character consistency
  characterProfile?: CharacterVisualProfile; // Character profile for consistency
  storyContext?: {
    characterName: string;
    characterAge?: string;
    characterRole: string;
    pageText: string;
    pageTranslation: string;
  };
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
      timeout: 45000, // 45 second timeout (well within Netlify's 60s limit)
      maxRetries: 1, // Allow one retry for transient failures
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

    const body: GeneratePageImageRequest = await request.json();
    const { pageNumber, imagePrompt, characterDescription, visualStyle, setting, storyContext, characterReferenceImage, characterProfile } = body;

    // Build a contextual prompt using the story information
    let contextualPrompt = '';
    let useCharacterConsistency = false;
    let profile: CharacterVisualProfile | undefined = characterProfile;
    
    // If we have story context but no character profile, generate one
    if (storyContext && !profile) {
      profile = generateCharacterProfile(
        {
          name: storyContext.characterName,
          nameJa: '', // Not needed for visual profile
          description: storyContext.characterRole,
          visualDescription: characterDescription
        },
        visualStyle
      );
      useCharacterConsistency = true;
    }
    
    if (profile) {
      // Use the character consistency system
      const sceneDescription = storyContext?.pageTranslation || imagePrompt;
      contextualPrompt = generateConsistentCharacterPrompt(profile, sceneDescription, pageNumber);

    } else if (storyContext) {
      // Fallback to old method
      const isStudent = storyContext.characterRole?.toLowerCase().includes('student') || 
                       storyContext.pageText?.includes('学校') ||
                       storyContext.pageTranslation?.toLowerCase().includes('school');
      
      const characterType = isStudent ? 'young student' : 'young person';
      const age = storyContext.characterAge || '';
      
      const pageAction = storyContext.pageTranslation || imagePrompt;
      
      contextualPrompt = `An adorable illustration in Japanese anime style showing a ${age} ${characterType} character. ${pageAction}. The character should be wearing appropriate attire (${isStudent ? 'school uniform' : 'casual clothes'}). ${visualStyle} art style, child-friendly.`;
    } else {
      // Fallback to generic prompt
      contextualPrompt = imagePrompt;
    }
    
    const dallePrompt = contextualPrompt;

    try {
      let imageUrl = '';
      let modelUsed = 'unknown';
      
      // Try OpenAI with character consistency first
      try {

        if (characterReferenceImage) {
          // Use the new approach with reference image for consistency
          const result = await generateImageWithGPTImage(dallePrompt, {
            referenceImage: characterReferenceImage,
            model: 'gpt-4o-mini',
            detail: 'high'
          });
          
          imageUrl = result.imageData;
          modelUsed = result.modelUsed;

        } else {
          // No reference image, use standard DALL-E 3
          const result = await generateImageWithDALLE3(dallePrompt, 'vivid');
          imageUrl = result.imageData;
          modelUsed = result.modelUsed;

        }
        
        // Convert to data URL if needed
        if (!imageUrl.startsWith('data:') && !imageUrl.startsWith('http')) {
          imageUrl = `data:image/png;base64,${imageUrl}`;
        }
        
      } catch (openAIError: any) {

        // Try Google Gemini as fallback

        if (!process.env.GOOGLE_GEMINI) {
          throw new Error('Google Gemini API key not configured');
        }
        
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI);
        
        // Use the preview image generation model
        const model = genAI.getGenerativeModel({ 
          model: 'gemini-2.0-flash-preview-image-generation'
        });
        
        // Generate image with response modalities
        const result = await model.generateContent({
          contents: [{ 
            role: 'user',
            parts: [{ text: dallePrompt }]
          }],
          generationConfig: {
            temperature: 0.4,
            topK: 32,
            topP: 1,
            maxOutputTokens: 4096,
            responseMimeType: 'image/png'
          }
        });
        
        const response = await result.response;
        const parts = response.candidates?.[0]?.content?.parts || [];
        
        // Look for the image in the response
        for (const part of parts) {
          if (part.inlineData?.data) {
            // Convert base64 to data URL
            const mimeType = part.inlineData.mimeType || 'image/png';
            imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
            modelUsed = 'gemini-2.0-flash-preview';

            break;
          }
        }
        
        if (!imageUrl) {
          throw new Error('Gemini did not return an image');
        }
      }

      return NextResponse.json({
        success: true,
        pageImage: {
          imageUrl: imageUrl,
          imageAlt: imagePrompt,
          pageNumber: pageNumber
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          modelUsed: modelUsed
        }
      });

    } catch (imageError: any) {
      console.error('Image generation error:', imageError);
      console.error('Failed prompt was:', dallePrompt);
      
      // Return success but with no image - don't fail the whole generation
      return NextResponse.json({
        success: true,
        pageImage: {
          imageUrl: '',
          imageAlt: imagePrompt,
          pageNumber: pageNumber,
          error: 'Image generation failed - continuing without image'
        },
        metadata: {
          generatedAt: new Date().toISOString()
        }
      });
    }

  } catch (error: any) {
    console.error('Error in image generation endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate image' },
      { status: 500 }
    );
  }
});