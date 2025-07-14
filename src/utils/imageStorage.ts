import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '@/lib/firebase';

const storage = getStorage(app);

/**
 * Downloads an image from a URL and uploads it to Firebase Storage
 * @param imageUrl The temporary image URL to download
 * @param path The storage path (e.g., 'stories/story-id/page-1.jpg')
 * @returns The permanent Firebase Storage URL
 */
export async function downloadAndStoreImage(imageUrl: string, path: string): Promise<string> {
  try {
    // Download the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    // Get the image as a blob
    const blob = await response.blob();

    // Create a storage reference
    const storageRef = ref(storage, path);

    // Upload the blob to Firebase Storage
    const snapshot = await uploadBytes(storageRef, blob, {
      contentType: blob.type || 'image/jpeg',
    });

    // Get the permanent download URL
    const permanentUrl = await getDownloadURL(snapshot.ref);

    return permanentUrl;
  } catch (error) {
    console.error('Error storing image:', error);
    throw error;
  }
}

/**
 * Downloads and stores multiple images in parallel
 * @param images Array of {url: string, path: string} objects
 * @returns Array of permanent URLs in the same order
 */
export async function downloadAndStoreMultipleImages(
  images: Array<{ url: string; path: string }>
): Promise<string[]> {
  const promises = images.map(({ url, path }) => downloadAndStoreImage(url, path));
  return Promise.all(promises);
}

/**
 * Generates a storage path for story images
 * @param storyId The story ID
 * @param pageNumber The page number (0-indexed)
 * @param type The image type ('page', 'cover', 'character-sheet', 'model-sheet')
 * @returns The storage path
 */
export function generateStoryImagePath(
  storyId: string,
  pageNumber: number | null,
  type: 'page' | 'cover' | 'character-sheet' | 'model-sheet' = 'page'
): string {
  const timestamp = Date.now();
  
  switch (type) {
    case 'page':
      return `stories/${storyId}/pages/page-${pageNumber}-${timestamp}.jpg`;
    case 'cover':
      return `stories/${storyId}/cover-${timestamp}.jpg`;
    case 'character-sheet':
      return `stories/${storyId}/characters/sheet-${timestamp}.jpg`;
    case 'model-sheet':
      return `stories/${storyId}/characters/model-sheet-${timestamp}.jpg`;
    default:
      return `stories/${storyId}/misc/${type}-${timestamp}.jpg`;
  }
}