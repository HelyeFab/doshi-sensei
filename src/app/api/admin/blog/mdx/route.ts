import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');

// GET: Read MDX file content
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    
    if (!slug) {
      return NextResponse.json({ error: 'Slug required' }, { status: 400 });
    }

    // Find the file
    const files = fs.readdirSync(POSTS_DIR);
    const file = files.find(f => {
      const fileSlug = f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.mdx?$/i, '');
      return fileSlug === slug;
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fullPath = path.join(POSTS_DIR, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    
    return NextResponse.json({ 
      content,
      filename: file,
      path: fullPath 
    });
  } catch (error) {
    console.error('Error reading MDX file:', error);
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}

// PUT: Update MDX file content
export async function PUT(request: NextRequest) {
  try {
    const { slug, content, newSlug } = await request.json();
    
    if (!slug || !content) {
      return NextResponse.json({ error: 'Slug and content required' }, { status: 400 });
    }

    // Find the file
    const files = fs.readdirSync(POSTS_DIR);
    const file = files.find(f => {
      const fileSlug = f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.mdx?$/i, '');
      return fileSlug === slug;
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fullPath = path.join(POSTS_DIR, file);
    
    // If slug changed, rename the file
    if (newSlug && newSlug !== slug) {
      const datePrefix = file.match(/^\d{4}-\d{2}-\d{2}-/)?.[0] || '';
      const newFilename = `${datePrefix}${newSlug}.mdx`;
      const newPath = path.join(POSTS_DIR, newFilename);
      
      // Write new content
      fs.writeFileSync(newPath, content, 'utf8');
      
      // Delete old file
      fs.unlinkSync(fullPath);
      
      return NextResponse.json({ 
        success: true, 
        message: 'File updated and renamed',
        newFilename 
      });
    } else {
      // Just update content
      fs.writeFileSync(fullPath, content, 'utf8');
      
      return NextResponse.json({ 
        success: true, 
        message: 'File updated' 
      });
    }
  } catch (error) {
    console.error('Error updating MDX file:', error);
    return NextResponse.json({ error: 'Failed to update file' }, { status: 500 });
  }
}

// DELETE: Delete MDX file
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    
    if (!slug) {
      return NextResponse.json({ error: 'Slug required' }, { status: 400 });
    }

    // Find the file
    const files = fs.readdirSync(POSTS_DIR);
    const file = files.find(f => {
      const fileSlug = f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.mdx?$/i, '');
      return fileSlug === slug;
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fullPath = path.join(POSTS_DIR, file);
    fs.unlinkSync(fullPath);
    
    return NextResponse.json({ 
      success: true, 
      message: 'File deleted' 
    });
  } catch (error) {
    console.error('Error deleting MDX file:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}