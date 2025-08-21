import { NextRequest, NextResponse } from 'next/server';
import { withFirebaseAdmin } from '@/utils/api-wrapper';
import admin from 'firebase-admin';

export const runtime = 'nodejs';

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

    // Test 1: Check if storage bucket is accessible
    // Explicitly specify the bucket name
    const bucket = firebaseAdmin.storage().bucket('doshi-sensei');
    const bucketName = bucket.name;

    // Test 2: Create a test text file
    const testContent = `Firebase Storage Test
Created at: ${new Date().toISOString()}
User: ${decodedToken.email}
This is a test file to verify Firebase Storage integration.`;

    const testFileName = `test/storage-test-${Date.now()}.txt`;
    const file = bucket.file(testFileName);

    // Upload the test file
    await file.save(Buffer.from(testContent), {
      metadata: {
        contentType: 'text/plain',
      },
    });

    // Generate a signed URL
    const [publicUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
    });

    // Test 3: Verify the file exists
    const [exists] = await file.exists();

    // Test 4: Get file metadata
    const [metadata] = await file.getMetadata();

    // Test 5: Try downloading an image from a URL and storing it
    let imageTestResult = null;
    try {
      // Use a small test image
      const testImageUrl = 'https://via.placeholder.com/150';
      const imageResponse = await fetch(testImageUrl);
      
      if (imageResponse.ok) {
        const arrayBuffer = await imageResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        const imageFileName = `test/test-image-${Date.now()}.png`;
        const imageFile = bucket.file(imageFileName);
        
        await imageFile.save(buffer, {
          metadata: {
            contentType: 'image/png',
          },
        });
        
        const [imageUrl] = await imageFile.getSignedUrl({
          action: 'read',
          expires: Date.now() + 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
        });
        
        imageTestResult = {
          success: true,
          url: imageUrl,
        };
      }
    } catch (imageError: any) {
      imageTestResult = {
        success: false,
        error: imageError.message,
      };
    }

    // Clean up test files after 1 minute
    setTimeout(async () => {
      try {
        await file.delete();

      } catch (err) {
        console.error('Error cleaning up test file:', err);
      }
    }, 60000);

    return NextResponse.json({
      success: true,
      tests: {
        bucketAccess: {
          success: true,
          bucketName: bucketName,
        },
        fileUpload: {
          success: exists,
          fileName: testFileName,
          publicUrl: publicUrl,
          size: metadata.size,
          created: metadata.timeCreated,
        },
        imageDownloadAndStore: imageTestResult,
      },
      message: 'All Firebase Storage tests completed successfully!',
    });

  } catch (error: any) {
    console.error('Storage test error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Storage test failed',
        details: error.stack,
        code: error.code,
      },
      { status: 500 }
    );
  }
});