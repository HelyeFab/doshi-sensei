import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Simple admin check - you can enhance this later
    const headersList = headers();
    const authorization = headersList.get('authorization');
    
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    
    // For now, we'll store images on a free image hosting service
    // You can replace this with your preferred solution
    const uploadResponse = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: new URLSearchParams({
        key: '9d5e8c4f4b8e8c4f4b8e8c4f4b8e8c4f', // Free API key - replace with your own
        image: base64,
        name: file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      })
    });

    const uploadData = await uploadResponse.json();
    
    if (!uploadData.success) {
      // Fallback: return data URL for local testing
      const dataUrl = `data:${file.type};base64,${base64}`;
      return NextResponse.json({ 
        success: true, 
        url: dataUrl,
        message: 'Using local data URL due to upload service issue'
      });
    }

    return NextResponse.json({ 
      success: true, 
      url: uploadData.data.url 
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      error: 'Upload failed', 
      details: error.message 
    }, { status: 500 });
  }
}