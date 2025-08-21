import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export async function uploadImage(file: File, folder: string = 'blog'): Promise<string> {
  try {
    // Create a unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
    const fileName = `${timestamp}-${sanitizedName}`;
    const filePath = `${folder}/${fileName}`;

    // Create storage reference
    const storageRef = ref(storage, filePath);

    // Upload file
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        uploadedAt: new Date().toISOString(),
      }
    });

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error('Failed to upload image');
  }
}

export async function uploadBase64Image(base64Data: string, folder: string = 'blog'): Promise<string> {
  try {
    // Convert base64 to blob
    const response = await fetch(base64Data);
    const blob = await response.blob();
    
    // Create a File object
    const timestamp = Date.now();
    const file = new File([blob], `image-${timestamp}.png`, { type: 'image/png' });
    
    return uploadImage(file, folder);
  } catch (error) {
    console.error('Error uploading base64 image:', error);
    throw new Error('Failed to upload base64 image');
  }
}