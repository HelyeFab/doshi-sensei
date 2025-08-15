// Combined blog post functions for both MDX and Firestore sources

import { getAllPosts as getAllMdxPosts, getPostBySlug as getMdxPostBySlug } from './posts';
import { getAllBlogPosts as getAllFirestorePosts, BlogPost } from '@/services/blogService';
import { Timestamp } from 'firebase/firestore';

export interface CombinedBlogPost {
  id: string;
  title: string;
  slug: string;
  content?: string;
  excerpt: string;
  author: string;
  tags: string[];
  status: 'draft' | 'published' | 'scheduled';
  publishDate: Date | string;
  source: 'mdx' | 'firestore';
  readingTime?: string;
  views?: number;
  cover?: string;
  isEditable: boolean; // MDX files can't be edited in admin, only Firestore posts
}

// Get all posts from both sources
export async function getAllCombinedPosts(): Promise<CombinedBlogPost[]> {
  try {
    // Get MDX posts
    let mdxPosts: any[] = [];
    try {
      mdxPosts = getAllMdxPosts(true);
    } catch (mdxError) {
      console.error('Error reading MDX posts:', mdxError);
    }
    
    // Get Firestore posts
    let firestorePosts: BlogPost[] = [];
    try {
      firestorePosts = await getAllFirestorePosts(true);
    } catch (firestoreError) {
      console.error('Error reading Firestore posts:', firestoreError);
    }
    
    // Convert and combine
    const combinedPosts: CombinedBlogPost[] = [
      // MDX posts
      ...mdxPosts.map(({ meta }) => ({
        id: `mdx-${meta.slug}`,
        title: meta.title,
        slug: meta.slug,
        excerpt: meta.excerpt || '',
        author: meta.author || 'Dōshi Sensei Team',
        tags: meta.tags || [],
        status: meta.status || 'published' as 'published',
        publishDate: meta.publishDate || meta.date,
        source: 'mdx' as const,
        readingTime: meta.readingTime,
        cover: meta.cover,
        isEditable: false, // MDX files can't be edited in admin UI
      })),
      
      // Firestore posts
      ...firestorePosts.map(post => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        author: post.author,
        tags: post.tags,
        status: post.status,
        publishDate: post.publishDate instanceof Timestamp 
          ? post.publishDate.toDate().toISOString() 
          : post.publishDate,
        source: 'firestore' as const,
        readingTime: post.readingTime,
        views: post.views,
        cover: post.cover,
        isEditable: true, // Firestore posts can be edited
      }))
    ];
    
    // Sort by date
    return combinedPosts.sort((a, b) => 
      new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
    );
  } catch (error) {
    console.error('Error fetching combined posts:', error);
    return [];
  }
}

// Get a specific post by slug from either source
export async function getCombinedPostBySlug(slug: string) {
  // First try MDX
  const mdxPost = getMdxPostBySlug(slug);
  if (mdxPost) {
    return {
      ...mdxPost,
      source: 'mdx' as const,
      isEditable: false,
    };
  }
  
  // Then try Firestore
  try {
    const firestorePost = await getAllFirestorePosts();
    const post = firestorePost.find(p => p.slug === slug);
    if (post) {
      return {
        ...post,
        source: 'firestore' as const,
        isEditable: true,
      };
    }
  } catch (error) {
    console.error('Error fetching Firestore post:', error);
  }
  
  return null;
}