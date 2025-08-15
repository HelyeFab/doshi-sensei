import { NextResponse } from 'next/server';
import { getAllPosts as getAllMdxPosts } from '@/lib/blog/posts';

export async function GET() {
  try {
    // Get MDX posts (server-side file reading)
    let mdxPosts: any[] = [];
    try {
      mdxPosts = getAllMdxPosts(true);
    } catch (error) {
      console.error('Error reading MDX posts:', error);
    }

    // Format MDX posts
    const formattedPosts = mdxPosts.map(({ meta }) => ({
      id: `mdx-${meta.slug}`,
      title: meta.title,
      slug: meta.slug,
      excerpt: meta.excerpt || '',
      author: meta.author || 'Dōshi Sensei Team',
      tags: meta.tags || [],
      status: meta.status || 'published',
      publishDate: meta.publishDate || meta.date,
      source: 'mdx',
      readingTime: meta.readingTime,
      cover: meta.cover,
      isEditable: false,
      views: 0,
    }));

    return NextResponse.json({ posts: formattedPosts });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch MDX posts', posts: [] }, { status: 500 });
  }
}