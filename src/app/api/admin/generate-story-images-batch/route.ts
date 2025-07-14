import { NextRequest, NextResponse } from 'next/server';
import { withFirebaseAdmin } from '@/utils/api-wrapper';
import OpenAI from 'openai';
import { generateConsistentCharacterPrompt } from '@/utils/character-consistency';
import type { AIStoryPage } from '@/types/ai-story';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface BatchImageRequest {
  pages: AIStoryPage[];
  characterProfile?: any;
  modelSheetUrl?: string;
  visualStyle?: string;
  useGemini?: boolean;
  sessionId?: string;
}

export const POST = withFirebaseAdmin(async (request: NextRequest) => {
  console.log('Batch image generation endpoint called');
  
  try {
    const { pages, characterProfile, modelSheetUrl, visualStyle, useGemini } = await request.json() as BatchImageRequest;
    
    if (!pages || pages.length === 0) {
      return NextResponse.json({ 
        error: 'Pages array is required' 
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

    const results = [];

    // Use Gemini if requested or if OpenAI key not available
    if (useGemini || !process.env.OPEN_AI_API_KEY) {
      // Import Gemini generation logic
      const { generateImageWithGemini } = await import('@/utils/gemini-image-generation');
      
      for (const page of pages) {
        try {
          const imageData = await generateImageWithGemini(page.imagePrompt, 'vivid');
          results.push({
            pageNumber: page.pageNumber,
            imageUrl: imageData.imageData,
            success: true,
            provider: 'gemini'
          });
        } catch (error: any) {
          results.push({
            pageNumber: page.pageNumber,
            error: error.message,
            success: false,
            provider: 'gemini'
          });
        }
      }
    } else {
      // Use OpenAI with character consistency
      const openai = new OpenAI({
        apiKey: process.env.OPEN_AI_API_KEY,
      });

      // Process pages in parallel (max 3 at a time to avoid rate limits)
      const batchSize = 3;
      for (let i = 0; i < pages.length; i += batchSize) {
        const batch = pages.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (page) => {
          try {
            let finalPrompt = page.imagePrompt;
            
            // If we have a character profile, use it for consistency
            if (characterProfile) {
              finalPrompt = generateConsistentCharacterPrompt(
                characterProfile,
                page.imagePrompt,
                page.pageNumber
              );
              
              // Add reference to model sheet if available
              if (modelSheetUrl) {
                finalPrompt += `\n\nCRITICAL: This character MUST look EXACTLY like the character in the model sheet reference. Same face, same hair, same outfit, same art style. NO variations allowed.`;
              }
            } else {
              // Even without a profile, try to maintain consistency
              console.warn(`No character profile for page ${page.pageNumber}, using original prompt`);
            }

            console.log(`Generating image for page ${page.pageNumber}`);
            console.log('Final prompt:', finalPrompt.substring(0, 200) + '...');
            
            const response = await openai.images.generate({
              model: 'dall-e-3',
              prompt: finalPrompt,
              n: 1,
              size: '1024x1024',
              quality: 'standard',
              style: 'vivid',
              response_format: 'url'
            });

            const imageUrl = response.data[0]?.url;
            
            if (!imageUrl) {
              throw new Error('No image URL returned');
            }

            return {
              pageNumber: page.pageNumber,
              imageUrl: imageUrl,
              prompt: finalPrompt,
              revisedPrompt: response.data[0]?.revised_prompt,
              success: true,
              provider: 'openai'
            };
          } catch (error: any) {
            console.error(`Failed to generate image for page ${page.pageNumber}:`, error);
            
            // Fallback to Gemini if OpenAI fails
            if (process.env.GOOGLE_GEMINI) {
              try {
                const { generateImageWithGemini } = await import('@/utils/gemini-image-generation');
                const imageData = await generateImageWithGemini(page.imagePrompt, 'vivid');
                return {
                  pageNumber: page.pageNumber,
                  imageUrl: imageData.imageData,
                  success: true,
                  provider: 'gemini-fallback'
                };
              } catch (geminiError: any) {
                return {
                  pageNumber: page.pageNumber,
                  error: `OpenAI: ${error.message}, Gemini: ${geminiError.message}`,
                  success: false,
                  provider: 'both-failed'
                };
              }
            }
            
            return {
              pageNumber: page.pageNumber,
              error: error.message,
              success: false,
              provider: 'openai'
            };
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults.map(r => r.status === 'fulfilled' ? r.value : r.reason));
        
        // Add delay between batches to avoid rate limits
        if (i + batchSize < pages.length) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Batch generation complete: ${successCount}/${pages.length} successful`);

    return NextResponse.json({
      success: true,
      results: results,
      summary: {
        total: pages.length,
        successful: successCount,
        failed: pages.length - successCount
      }
    });

  } catch (error: any) {
    console.error('Error in batch image generation:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Batch generation failed',
        details: error.stack
      },
      { status: 500 }
    );
  }
});