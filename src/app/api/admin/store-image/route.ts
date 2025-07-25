import { NextRequest, NextResponse } from 'next/server';
import { withFirebaseAdmin } from '@/utils/api-wrapper';

export const runtime = 'nodejs';
export const maxDuration = 60;

export const POST = withFirebaseAdmin(async (request: NextRequest) => {
  try {
    // Get Firebase Admin and verify auth
    const firebaseAdmin = (request as any).firebaseAdmin;
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
    const isAdmin = decodedToken.admin === true || decodedToken.email === 'emmanuelfabiani23@gmail.com';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { imageUrl, storagePath } = await request.json();

    if (!imageUrl || !storagePath) {
      return NextResponse.json(
        { error: 'Missing required fields: imageUrl and storagePath' },
        { status: 400 }
      );
    }

    // Download the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    // Get the image as a buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get Firebase Storage bucket
    const bucket = firebaseAdmin.storage().bucket();

    // Create a file reference
    const file = bucket.file(storagePath);

    // Upload the buffer
    await file.save(buffer, {
      metadata: {
        contentType: response.headers.get('content-type') || 'image/jpeg',
      },
    });

    // Generate a signed URL that expires in 10 years (effectively permanent)
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
    });

    return NextResponse.json({
      success: true,
      url: signedUrl,
    });
  } catch (error: any) {
    console.error('Error storing image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to store image' },
      { status: 500 }
    );
  }
});