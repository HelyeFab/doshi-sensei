import { AICharacterSheet } from '@/types/ai-story';

/**
 * Character Consistency System
 * 
 * Since DALL-E 3 doesn't maintain character consistency well,
 * we use a detailed character sheet approach with specific tags
 */

export interface CharacterVisualProfile {
  // Core identity markers that should remain constant
  characterId: string; // Unique identifier for this character
  gender: 'male' | 'female' | 'non-binary';
  apparentAge: string; // e.g., "10-year-old", "teenage"
  
  // Detailed appearance
  hairStyle: string; // e.g., "short spiky", "long straight", "twin tails"
  hairColor: string; // e.g., "jet black", "dark brown", "blonde"
  eyeColor: string; // e.g., "deep blue", "brown", "green"
  skinTone: string; // e.g., "fair", "light", "tan"
  
  // Distinctive features
  facialFeatures: string; // e.g., "round face, small nose"
  bodyBuild: string; // e.g., "slim", "average", "athletic"
  height: string; // e.g., "short for age", "average", "tall"
  
  // Clothing (for consistency)
  primaryOutfit: string; // Main clothing description
  outfitColors: string; // Color scheme
  accessories?: string; // Optional accessories
  
  // Art style lock
  artStyle: string; // MUST be consistent across all images
  styleModifiers: string[]; // Additional style tags
}

/**
 * Generate a character visual profile from a character sheet
 */
/**
 * Generate character profiles with enhanced consistency features
 * Inspired by ChronoKnights multi-turn generation approach
 */
export function generateCharacterProfile(
  character: AICharacterSheet['mainCharacter'],
  visualStyle: string,
  options?: {
    sessionId?: string; // For multi-image sessions
    primaryPrompt?: string; // Main instruction for the session
  }
): CharacterVisualProfile {
  // Parse the visual description to extract consistent elements
  const description = character.visualDescription.toLowerCase();
  
  // Extract gender
  let gender: 'male' | 'female' | 'non-binary' = 'non-binary';
  if (description.includes('boy') || description.includes('male')) gender = 'male';
  else if (description.includes('girl') || description.includes('female')) gender = 'female';
  
  // Create a unique character ID based on name and key features
  const characterId = `${character.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
  
  // Create more detailed profile based on ChronoKnights approach
  const profile: CharacterVisualProfile = {
    characterId: options?.sessionId ? `${characterId}-${options.sessionId}` : characterId,
    gender,
    apparentAge: extractAge(description),
    hairStyle: extractHairStyle(description),
    hairColor: extractHairColor(description),
    eyeColor: extractEyeColor(description),
    skinTone: extractSkinTone(description),
    facialFeatures: extractFacialFeatures(description),
    bodyBuild: extractBodyBuild(description),
    height: extractHeight(description),
    primaryOutfit: extractOutfit(description),
    outfitColors: extractColors(description),
    artStyle: normalizeArtStyle(visualStyle),
    styleModifiers: [
      'consistent character depiction',
      'maintain exact appearance across all images',
      'comic/manga panel style',
      'character design consistency'
    ]
  };
  
  return profile;
}

/**
 * Generate a consistent prompt for a character in a scene
 * Using ChronoKnights-style detailed character descriptions
 */
export function generateConsistentCharacterPrompt(
  profile: CharacterVisualProfile,
  sceneDescription: string,
  pageNumber: number
): string {
  // Format like ChronoKnights - clear bullet points for each feature
  const characterBulletPoints = [
    `Featured character:`,
    `• ${profile.gender === 'male' ? 'A' : profile.gender === 'female' ? 'A' : 'A'} ${profile.apparentAge} ${profile.gender === 'non-binary' ? 'child' : profile.gender} with ${profile.hairStyle} ${profile.hairColor} hair`,
    `• ${profile.eyeColor} eyes and ${profile.skinTone} skin`,
    `• ${profile.facialFeatures}`,
    `• ${profile.bodyBuild} build, ${profile.height}`,
    `• Wears ${profile.primaryOutfit} in ${profile.outfitColors}`,
    profile.accessories ? `• ${profile.accessories}` : ''
  ].filter(Boolean).join('\n');
  
  // Combine with scene and style
  return `Panel ${pageNumber} - ${sceneDescription}
Prompt:

${characterBulletPoints}

Action: ${sceneDescription}

Style: ${profile.artStyle}, ${profile.styleModifiers.join(', ')}. Ensure to consistently depict this character in all images.`;
}

/**
 * Generate a character reference sheet prompt
 * Using comic/manga style reference sheet approach
 */
export function generateCharacterSheetPrompt(profile: CharacterVisualProfile): string {
  const characterDetails = [
    `Character Reference Sheet: ${profile.characterId}`,
    ``,
    `Main character design:`,
    `• ${profile.gender === 'male' ? 'A' : profile.gender === 'female' ? 'A' : 'A'} ${profile.apparentAge} ${profile.gender === 'non-binary' ? 'child' : profile.gender}`,
    `• ${profile.hairStyle} ${profile.hairColor} hair`,
    `• ${profile.eyeColor} eyes, ${profile.skinTone} skin`,
    `• ${profile.facialFeatures}`,
    `• ${profile.bodyBuild} build, ${profile.height}`,
    `• Standard outfit: ${profile.primaryOutfit} in ${profile.outfitColors}`,
    profile.accessories ? `• Accessories: ${profile.accessories}` : '',
    ``,
    `Show multiple views of the same character: front view, side profile, three-quarter view.`,
    `Style: ${profile.artStyle}, character model sheet, consistent character design reference.`,
    `White background, clean layout.`
  ].filter(Boolean).join('\n');
  
  return characterDetails;
}

// Helper functions to extract features
function extractAge(description: string): string {
  if (description.includes('young')) return 'young child';
  if (description.includes('teenage')) return 'teenager';
  if (description.includes('student')) return '10-12 year old';
  return 'child';
}

function extractHairStyle(description: string): string {
  if (description.includes('short')) return 'short neat';
  if (description.includes('long')) return 'long straight';
  if (description.includes('spiky')) return 'short spiky';
  return 'medium length';
}

function extractHairColor(description: string): string {
  if (description.includes('black')) return 'jet black';
  if (description.includes('brown')) return 'dark brown';
  if (description.includes('blonde')) return 'golden blonde';
  return 'dark';
}

function extractEyeColor(description: string): string {
  if (description.includes('blue')) return 'bright blue';
  if (description.includes('brown')) return 'warm brown';
  if (description.includes('green')) return 'emerald green';
  return 'dark brown';
}

function extractSkinTone(description: string): string {
  if (description.includes('fair')) return 'fair';
  if (description.includes('light')) return 'light';
  if (description.includes('tan')) return 'tan';
  if (description.includes('dark')) return 'dark';
  return 'fair'; // Default for anime style
}

function extractFacialFeatures(description: string): string {
  const features = [];
  if (description.includes('round face')) features.push('round face');
  else if (description.includes('oval face')) features.push('oval face');
  else features.push('friendly face');
  
  if (description.includes('big eyes') || description.includes('large eyes')) {
    features.push('large expressive eyes');
  } else {
    features.push('bright eyes');
  }
  
  if (description.includes('smile')) features.push('warm smile');
  
  return features.join(', ') || 'anime-style face with expressive features';
}

function extractBodyBuild(description: string): string {
  if (description.includes('slim')) return 'slim';
  if (description.includes('athletic')) return 'athletic';
  if (description.includes('stocky')) return 'stocky';
  if (description.includes('average')) return 'average';
  return 'child-like proportions';
}

function extractHeight(description: string): string {
  if (description.includes('tall')) return 'tall for age';
  if (description.includes('short')) return 'short for age';
  if (description.includes('average')) return 'average height';
  return 'average for age';
}

function extractOutfit(description: string): string {
  if (description.includes('uniform')) {
    if (description.includes('school')) return 'Japanese school uniform';
    return 'uniform';
  }
  if (description.includes('casual')) return 'casual clothes';
  return 'simple outfit';
}

function extractColors(description: string): string {
  const colors: string[] = [];
  if (description.includes('blue')) colors.push('blue');
  if (description.includes('white')) colors.push('white');
  if (description.includes('red')) colors.push('red');
  if (description.includes('black')) colors.push('black');
  
  return colors.length > 0 ? colors.join(' and ') : 'blue and white';
}

function normalizeArtStyle(style: string): string {
  const normalized = style.toLowerCase();
  
  // More specific style definitions based on ChronoKnights approach
  if (normalized.includes('anime')) {
    return 'anime illustration style with flat colors, cell shading, consistent character design';
  }
  if (normalized.includes('manga')) {
    return 'manga style with detailed ink lines, consistent character model';
  }
  if (normalized.includes('cartoon')) {
    return 'cartoon style with bold outlines, flat colors, consistent character appearance';
  }
  if (normalized.includes('comic')) {
    return 'comic panel style with clear character depiction, consistent across all panels';
  }
  
  // Default to specific anime style
  return 'anime illustration style, flat colors, simple shading, character consistency';
}

/**
 * Create a session prompt for multi-image generation
 * Based on ChronoKnights "Main Prompt" approach
 */
export function createCharacterSessionPrompt(
  character: AICharacterSheet['mainCharacter'],
  totalScenes: number
): string {
  return `In this session, we will be creating ${totalScenes} images for a story. The story features the main character: ${character.name}. Ensure to consistently depict this character in all images. The character should maintain the exact same appearance, outfit, and art style throughout all scenes.`;
}