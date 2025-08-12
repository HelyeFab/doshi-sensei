import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY,
});

interface CoverGenerationResult {
  imageUrl?: string;
  unsplashUrl?: string;
  generatedPrompt?: string;
  method: 'dall-e' | 'unsplash' | 'fallback';
}

// Unsplash API configuration
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const UNSPLASH_API_URL = 'https://api.unsplash.com/search/photos';

async function searchUnsplash(keywords: string[]): Promise<string | null> {
  if (!UNSPLASH_ACCESS_KEY) {
    console.log('❌ [COVER] Unsplash API key not configured');
    return null;
  }

  try {
    const query = keywords.join(' ');
    const response = await fetch(
      `${UNSPLASH_API_URL}?query=${encodeURIComponent(query)}&orientation=landscape&per_page=10`,
      {
        headers: {
          'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
      }
    );

    if (!response.ok) {
      console.error('Unsplash API error:', response.status);
      return null;
    }

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      // Select a random image from top results for variety
      const randomIndex = Math.floor(Math.random() * Math.min(5, data.results.length));
      const image = data.results[randomIndex];
      
      // Return medium-sized image URL with attribution
      return `${image.urls.regular}?utm_source=doshi_sensei&utm_medium=referral`;
    }

    return null;
  } catch (error) {
    console.error('Unsplash search error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      title, 
      keywords = [],
      contentSummary,
      preferDallE = false 
    } = await request.json();

    if (!title && keywords.length === 0) {
      return NextResponse.json(
        { error: 'Title or keywords required for cover generation' },
        { status: 400 }
      );
    }

    console.log('🎨 [COVER] Generating cover image:', {
      title,
      keywords,
      preferDallE
    });

    // Step 1: Try Unsplash first (unless DALL-E is preferred)
    if (!preferDallE && keywords.length > 0) {
      const unsplashUrl = await searchUnsplash([...keywords, 'Japan']);
      if (unsplashUrl) {
        console.log('✅ [COVER] Found Unsplash image');
        return NextResponse.json({
          imageUrl: unsplashUrl,
          unsplashUrl,
          method: 'unsplash'
        } as CoverGenerationResult);
      }
    }

    // Step 2: Generate with DALL-E if Unsplash fails or is not preferred
    if (process.env.OPEN_AI_API_KEY) {
      try {
        // Generate optimized prompt for DALL-E
        const promptSystemMessage = `You are an expert at creating image generation prompts for article covers.
Create a concise, descriptive prompt for DALL-E 3 that will generate an appropriate cover image.

Guidelines:
1. Focus on Japanese cultural elements when relevant
2. Use artistic styles like "watercolor", "minimalist", "illustration"
3. Avoid text in the image
4. Keep it simple and visually appealing
5. Maximum 150 characters

Return ONLY the prompt text, nothing else.`;

        const promptCompletion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            { role: "system", content: promptSystemMessage },
            { role: "user", content: `Create an image prompt for this article:\nTitle: ${title}\nKeywords: ${keywords.join(', ')}\nSummary: ${contentSummary || 'Japanese language learning article'}` }
          ],
          temperature: 0.7,
          max_tokens: 100
        });

        const imagePrompt = promptCompletion.choices[0].message.content || 
          `Japanese cultural scene, ${keywords.slice(0, 3).join(', ')}, watercolor illustration, minimalist style`;

        console.log('🎨 [COVER] Generated DALL-E prompt:', imagePrompt);

        // Generate image with DALL-E 3
        const imageResponse = await openai.images.generate({
          model: "dall-e-3",
          prompt: imagePrompt,
          n: 1,
          size: "1792x1024",
          quality: "standard",
          style: "natural"
        });

        if (imageResponse.data && imageResponse.data[0]?.url) {
          console.log('✅ [COVER] Generated DALL-E image');
          return NextResponse.json({
            imageUrl: imageResponse.data[0].url,
            generatedPrompt: imagePrompt,
            method: 'dall-e'
          } as CoverGenerationResult);
        }
      } catch (dallEError: any) {
        console.error('DALL-E generation error:', dallEError);
        
        // If DALL-E fails, try Unsplash as fallback
        if (keywords.length > 0) {
          const unsplashUrl = await searchUnsplash([...keywords, 'Japan', 'study']);
          if (unsplashUrl) {
            console.log('✅ [COVER] Fallback to Unsplash after DALL-E failure');
            return NextResponse.json({
              imageUrl: unsplashUrl,
              unsplashUrl,
              method: 'unsplash'
            } as CoverGenerationResult);
          }
        }
      }
    }

    // Step 3: Final fallback - return generic Japanese-themed Unsplash image
    const fallbackUrl = await searchUnsplash(['Japan', 'culture', 'traditional', 'landscape']);
    if (fallbackUrl) {
      console.log('✅ [COVER] Using generic fallback image');
      return NextResponse.json({
        imageUrl: fallbackUrl,
        unsplashUrl: fallbackUrl,
        method: 'fallback'
      } as CoverGenerationResult);
    }

    // If all methods fail, return error
    return NextResponse.json(
      { error: 'Failed to generate cover image' },
      { status: 500 }
    );

  } catch (error: any) {
    console.error('Cover generation error:', error);
    
    return NextResponse.json(
      { error: 'Failed to generate cover image' },
      { status: 500 }
    );
  }
}