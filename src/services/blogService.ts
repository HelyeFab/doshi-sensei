import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  author: string;
  authorImage?: string;
  cover?: string;
  tags: string[];
  status: 'draft' | 'published' | 'scheduled';
  publishDate: Date | Timestamp;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
  canonical?: string;
  readingTime?: string;
  views?: number;
}

const COLLECTION = 'blogPosts';

// Calculate reading time
function calculateReadingTime(content: string): string {
  const wordsPerMinute = 200;
  const wordCount = content.trim().split(/\s+/).length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return `${minutes} min read`;
}

// Create or update a blog post
export async function saveBlogPost(post: Partial<BlogPost>, postId?: string): Promise<string> {
  try {
    const id = postId || doc(collection(db, COLLECTION)).id;
    const postRef = doc(db, COLLECTION, id);
    
    const postData = {
      ...post,
      id,
      slug: post.slug || post.title?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      readingTime: post.content ? calculateReadingTime(post.content) : undefined,
      updatedAt: serverTimestamp(),
      createdAt: postId ? post.createdAt : serverTimestamp(),
    };

    if (postId) {
      await updateDoc(postRef, postData);
    } else {
      await setDoc(postRef, postData);
    }

    return id;
  } catch (error) {
    console.error('Error saving blog post:', error);
    throw error;
  }
}

// Get all blog posts (admin view)
export async function getAllBlogPosts(includeScheduled = true): Promise<BlogPost[]> {
  try {
    const postsQuery = query(
      collection(db, COLLECTION),
      orderBy('publishDate', 'desc')
    );
    
    const snapshot = await getDocs(postsQuery);
    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BlogPost));

    if (!includeScheduled) {
      const now = new Date();
      return posts.filter(post => {
        if (post.status === 'draft') return false;
        if (post.status === 'scheduled') {
          const publishDate = post.publishDate instanceof Timestamp 
            ? post.publishDate.toDate() 
            : new Date(post.publishDate);
          return publishDate <= now;
        }
        return true;
      });
    }

    return posts;
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    throw error;
  }
}

// Get published blog posts (public view)
export async function getPublishedBlogPosts(maxPosts?: number): Promise<BlogPost[]> {
  try {
    const now = Timestamp.now();
    let postsQuery = query(
      collection(db, COLLECTION),
      where('status', 'in', ['published', 'scheduled']),
      orderBy('publishDate', 'desc')
    );

    if (maxPosts) {
      postsQuery = query(postsQuery, limit(maxPosts));
    }
    
    const snapshot = await getDocs(postsQuery);
    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BlogPost));

    // Filter scheduled posts that should be published
    return posts.filter(post => {
      if (post.status === 'published') return true;
      if (post.status === 'scheduled') {
        const publishDate = post.publishDate instanceof Timestamp 
          ? post.publishDate.toDate() 
          : new Date(post.publishDate);
        return publishDate <= new Date();
      }
      return false;
    });
  } catch (error) {
    console.error('Error fetching published blog posts:', error);
    throw error;
  }
}

// Get a single blog post by slug
export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const postsQuery = query(
      collection(db, COLLECTION),
      where('slug', '==', slug),
      limit(1)
    );
    
    const snapshot = await getDocs(postsQuery);
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    const post = {
      id: doc.id,
      ...doc.data()
    } as BlogPost;

    // Check if post should be visible
    if (post.status === 'draft') return null;
    if (post.status === 'scheduled') {
      const publishDate = post.publishDate instanceof Timestamp 
        ? post.publishDate.toDate() 
        : new Date(post.publishDate);
      if (publishDate > new Date()) return null;
    }

    return post;
  } catch (error) {
    console.error('Error fetching blog post by slug:', error);
    throw error;
  }
}

// Get a single blog post by ID (admin)
export async function getBlogPostById(id: string): Promise<BlogPost | null> {
  try {
    const postRef = doc(db, COLLECTION, id);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) return null;
    
    return {
      id: postDoc.id,
      ...postDoc.data()
    } as BlogPost;
  } catch (error) {
    console.error('Error fetching blog post by ID:', error);
    throw error;
  }
}

// Delete a blog post
export async function deleteBlogPost(id: string): Promise<void> {
  try {
    const postRef = doc(db, COLLECTION, id);
    await deleteDoc(postRef);
  } catch (error) {
    console.error('Error deleting blog post:', error);
    throw error;
  }
}

// Get related posts by tags
export async function getRelatedPosts(currentSlug: string, tags: string[], maxPosts = 3): Promise<BlogPost[]> {
  try {
    if (tags.length === 0) return [];
    
    const postsQuery = query(
      collection(db, COLLECTION),
      where('status', '==', 'published'),
      where('tags', 'array-contains-any', tags),
      orderBy('publishDate', 'desc'),
      limit(maxPosts + 1) // Get one extra in case current post is included
    );
    
    const snapshot = await getDocs(postsQuery);
    const posts = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      } as BlogPost))
      .filter(post => post.slug !== currentSlug)
      .slice(0, maxPosts);

    return posts;
  } catch (error) {
    console.error('Error fetching related posts:', error);
    return [];
  }
}

// Increment view count
export async function incrementBlogPostViews(id: string): Promise<void> {
  try {
    const postRef = doc(db, COLLECTION, id);
    const postDoc = await getDoc(postRef);
    
    if (postDoc.exists()) {
      const currentViews = postDoc.data().views || 0;
      await updateDoc(postRef, {
        views: currentViews + 1
      });
    }
  } catch (error) {
    console.error('Error incrementing blog post views:', error);
  }
}

// Publish scheduled posts (can be called periodically)
export async function publishScheduledPosts(): Promise<void> {
  try {
    const now = Timestamp.now();
    const scheduledQuery = query(
      collection(db, COLLECTION),
      where('status', '==', 'scheduled'),
      where('publishDate', '<=', now)
    );
    
    const snapshot = await getDocs(scheduledQuery);
    const updatePromises = snapshot.docs.map(doc => 
      updateDoc(doc.ref, { 
        status: 'published',
        updatedAt: serverTimestamp()
      })
    );
    
    await Promise.all(updatePromises);
    console.log(`Published ${snapshot.size} scheduled posts`);
  } catch (error) {
    console.error('Error publishing scheduled posts:', error);
  }
}