import { NextRequest, NextResponse } from 'next/server';
import { withFirebaseAdmin } from '@/utils/api-wrapper';
import { generateCharacterReferenceImage } from '@/utils/openai-image-generation';
import { AICharacterSheet } from '@/types/ai-story';

// Configure for API route timeout
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for image generation on Netlify Functions

interface GenerateCharacterImagesRequest {
  characterSheet: AICharacterSheet;
}

export const POST = withFirebaseAdmin(async (request: NextRequest) => {

  try {
    if (!process.env.OPEN_AI_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured' 
      }, { status: 500 });
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

    const body: GenerateCharacterImagesRequest = await request.json();
    const { characterSheet } = body;

    // Generate reference image for main character

    let mainCharacterImage = '';
    
    try {
      const mainCharResult = await generateCharacterReferenceImage(
        characterSheet.mainCharacter.visualDescription,
        characterSheet.visualStyle,
        { model: 'gpt-4o-mini' }
      );
      
      // Convert to data URL if needed
      mainCharacterImage = mainCharResult.imageData.startsWith('data:') 
        ? mainCharResult.imageData 
        : `data:image/png;base64,${mainCharResult.imageData}`;

    } catch (error) {
      console.error('Failed to generate main character image:', error);
      // Continue without image rather than failing completely
    }

    // Generate reference images for supporting characters
    const supportingCharacterImages: Record<string, string> = {};
    
    for (const character of characterSheet.supportingCharacters) {
      if (character.visualDescription) {

        try {
          const charResult = await generateCharacterReferenceImage(
            character.visualDescription,
            characterSheet.visualStyle,
            { model: 'gpt-4o-mini' }
          );
          
          const imageUrl = charResult.imageData.startsWith('data:') 
            ? charResult.imageData 
            : `data:image/png;base64,${charResult.imageData}`;
            
          supportingCharacterImages[character.name] = imageUrl;

        } catch (error) {
          console.error(`Failed to generate image for ${character.name}:`, error);
          // Continue with other characters
        }
      }
    }

    // Update the character sheet with reference images
    const updatedCharacterSheet: AICharacterSheet = {
      ...characterSheet,
      mainCharacter: {
        ...characterSheet.mainCharacter,
        referenceImage: mainCharacterImage
      },
      supportingCharacters: characterSheet.supportingCharacters.map(char => ({
        ...char,
        referenceImage: supportingCharacterImages[char.name] || undefined
      }))
    };

    return NextResponse.json({
      success: true,
      characterSheet: updatedCharacterSheet,
      referenceImages: {
        mainCharacter: mainCharacterImage,
        supportingCharacters: supportingCharacterImages
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        imagesGenerated: Object.keys(supportingCharacterImages).length + (mainCharacterImage ? 1 : 0)
      }
    });

  } catch (error: any) {
    console.error('Error in character images generation endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate character images' },
      { status: 500 }
    );
  }
});