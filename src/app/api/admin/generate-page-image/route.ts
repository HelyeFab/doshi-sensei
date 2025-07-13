import { NextRequest, NextResponse } from 'next/server';
import { withFirebaseAdmin } from '@/utils/api-wrapper';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Configure for API route timeout
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for image generation on Netlify Functions

interface GeneratePageImageRequest {
  pageNumber: number;
  imagePrompt: string;
  characterDescription: string;
  visualStyle: string;
  setting: string;
  storyContext?: {
    characterName: string;
    characterAge?: string;
    characterRole: string;
    pageText: string;
    pageTranslation: string;
  };
}

export const POST = withFirebaseAdmin(async (request: NextRequest) => {
  console.log('Generate page image endpoint called');
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
    const isAdmin = decodedToken.admin === true || decodedToken.email === 'emmanuelfabiani23@gmail.com';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body: GeneratePageImageRequest = await request.json();
    const { pageNumber, imagePrompt, characterDescription, visualStyle, setting, storyContext } = body;

    // Build a contextual prompt using the story information
    let contextualPrompt = '';
    
    if (storyContext) {
      // Determine character type from context
      const isStudent = storyContext.characterRole?.toLowerCase().includes('student') || 
                       storyContext.pageText?.includes('学校') ||
                       storyContext.pageTranslation?.toLowerCase().includes('school');
      
      const characterType = isStudent ? 'young student' : 'young person';
      const age = storyContext.characterAge || '';
      
      // Extract the scene from the page content
      const pageAction = storyContext.pageTranslation || imagePrompt;
      
      // Build a specific prompt based on the story content
      contextualPrompt = `An adorable illustration in Japanese anime style showing a ${age} ${characterType} character. ${pageAction}. The character should be wearing appropriate attire (${isStudent ? 'school uniform' : 'casual clothes'}). ${visualStyle} art style, child-friendly.`;
      
      console.log('Using story context for prompt generation');
      console.log('Character role:', storyContext.characterRole);
      console.log('Page translation:', storyContext.pageTranslation);
    } else {
      // Fallback to generic prompt
      contextualPrompt = imagePrompt;
    }
    
    // Simplify the prompt to avoid content policy issues
    const simplifiedPrompt = contextualPrompt
      .replace(/[A-Z][a-z]+/g, 'character') // Replace specific names
      .replace(/\b(he|she|him|her|his|hers)\b/gi, 'they') // Gender neutral
      .replace(/\s+/g, ' ')
      .trim();
    
    const dallePrompt = simplifiedPrompt;

    console.log(`Generating image for page ${pageNumber}...`);
    console.log('GPT Image 1 prompt:', dallePrompt);

    try {
      let imageUrl = '';
      let modelUsed = 'unknown';
      
      // Try DALL-E 3 first
      try {
        console.log('Attempting image generation with DALL-E 3');
        console.log('Prompt:', dallePrompt);
        
        const imageResponse = await openai.images.generate({
          model: 'dall-e-3',
          prompt: dallePrompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
          style: 'vivid'
        });

        imageUrl = imageResponse.data[0]?.url || '';
        modelUsed = 'dall-e-3';
        
        if (!imageUrl) {
          throw new Error('No image URL returned from DALL-E 3');
        }
        
        console.log(`DALL-E 3 generation successful for page ${pageNumber}`);
        
      } catch (dalleError: any) {
        console.log('DALL-E 3 failed:', dalleError.message);
        
        // Try Google Gemini as fallback
        console.log('Trying Google Gemini as fallback...');
        
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
            console.log('Gemini image generated successfully');
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