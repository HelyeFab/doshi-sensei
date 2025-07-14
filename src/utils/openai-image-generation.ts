import OpenAI from 'openai';

export interface ImageGenerationOptions {
  model?: 'gpt-4.1-mini' | 'gpt-4.1' | 'gpt-4o-mini';
  referenceImage?: string; // Base64 or URL of reference image for consistency
  detail?: 'low' | 'high' | 'auto';
}

export interface ImageGenerationResult {
  imageData: string; // Base64 image data
  modelUsed: string;
  tokensUsed?: number;
}

/**
 * Generate an image using a more consistent approach with character sheets
 */
export async function generateImageWithGPTImage(
  prompt: string,
  options: ImageGenerationOptions = {}
): Promise<ImageGenerationResult> {
  const {
    model = 'gpt-4o-mini',
    referenceImage,
    detail = 'auto'
  } = options;

  if (!process.env.OPEN_AI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const openai = new OpenAI({
    apiKey: process.env.OPEN_AI_API_KEY,
    timeout: 45000, // 45 second timeout
    maxRetries: 1,
  });

  try {
    // For character consistency, we'll use a different approach
    // Instead of trying to get DALL-E to match exactly, we'll use style and character tags
    
    if (referenceImage) {
      // Note: DALL-E 3 doesn't support image inputs directly
      // We'll need to rely on detailed text descriptions and consistent style tags
      console.log('Using detailed character description approach for consistency');
    }

    // Generate with DALL-E 3
    console.log('Generating image with DALL-E 3...');
    const imageResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      style: 'vivid',
      response_format: 'b64_json'
    });

    const imageData = imageResponse.data[0]?.b64_json;
    if (!imageData) {
      throw new Error('No image data returned');
    }

    return {
      imageData,
      modelUsed: 'dall-e-3',
      tokensUsed: undefined
    };
  } catch (error: any) {
    console.error('Error generating image:', error);
    throw error;
  }
}

/**
 * Generate a character reference image that can be used for consistency
 */
export async function generateCharacterReferenceImage(
  characterDescription: string,
  visualStyle: string,
  options: ImageGenerationOptions = {}
): Promise<ImageGenerationResult> {
  // Create a detailed prompt for the reference image
  const referencePrompt = `Create a character portrait in ${visualStyle} style. ${characterDescription}. 
Show the character in a neutral pose with clear facial features, suitable as a reference image. 
The image should clearly show the character's appearance including face, hair, and upper body.
Background should be simple and not distracting.`;

  return generateImageWithGPTImage(referencePrompt, {
    ...options,
    detail: 'high' // Use high detail for reference images
  });
}

/**
 * Fallback to DALL-E 3 if gpt-image-1 fails
 */
export async function generateImageWithDALLE3(
  prompt: string,
  style: 'vivid' | 'natural' = 'vivid'
): Promise<ImageGenerationResult> {
  if (!process.env.OPEN_AI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const openai = new OpenAI({
    apiKey: process.env.OPEN_AI_API_KEY,
    timeout: 45000,
    maxRetries: 1,
  });

  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      style: style,
      response_format: 'b64_json' // Get base64 data instead of URL
    });

    const imageData = response.data[0]?.b64_json;
    if (!imageData) {
      throw new Error('No image data returned from DALL-E 3');
    }

    return {
      imageData,
      modelUsed: 'dall-e-3'
    };
  } catch (error: any) {
    console.error('Error generating image with DALL-E 3:', error);
    throw error;
  }
}