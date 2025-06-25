import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  Timestamp,
  increment
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ResourcePost, ResourceFormData, ResourceSearchFilters, ResourceStats, ResourceListItem } from '@/types/resources';

const RESOURCES_COLLECTION = 'resources';

/**
 * Generate URL-friendly slug from title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100); // Limit length
}

/**
 * Calculate reading time based on content
 */
export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Extract excerpt from markdown content
 */
export function extractExcerpt(content: string, maxLength: number = 160): string {
  // Remove markdown formatting for excerpt
  const plainText = content
    .replace(/#{1,6}\s+/g, '') // Headers
    .replace(/\*{1,2}(.*?)\*{1,2}/g, '$1') // Bold/italic
    .replace(/`(.*?)`/g, '$1') // Inline code
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // Links
    .replace(/\n+/g, ' ') // Line breaks
    .trim();
  
  return plainText.length > maxLength 
    ? plainText.substring(0, maxLength).trim() + '...'
    : plainText;
}

/**
 * Create a new resource post
 */
export async function createResourcePost(data: ResourceFormData, authorId: string): Promise<string> {
  try {
    const now = new Date();
    const slug = data.slug || generateSlug(data.title);
    
    // Check if slug already exists
    const slugQuery = query(
      collection(db, RESOURCES_COLLECTION),
      where('slug', '==', slug)
    );
    const slugSnapshot = await getDocs(slugQuery);
    
    if (!slugSnapshot.empty) {
      throw new Error('A post with this slug already exists');
    }

    const readingTime = calculateReadingTime(data.content);
    const excerpt = data.excerpt || extractExcerpt(data.content);

    const resourcePost: Omit<ResourcePost, 'id'> = {
      title: data.title.trim(),
      subtitle: data.subtitle?.trim() || undefined,
      slug,
      content: data.content,
      excerpt,
      imageUrl: data.imageUrl?.trim() || undefined,
      imageAlt: data.imageAlt?.trim() || undefined,
      author: {
        id: authorId,
        name: 'Admin', // You can enhance this with actual user data
        email: '' // You can enhance this with actual user data
      },
      status: data.status,
      publishedAt: data.status === 'published' ? now : undefined,
      scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
      createdAt: now,
      updatedAt: now,
      tags: data.tags.filter(tag => tag.trim()).map(tag => tag.trim()),
      category: data.category?.trim() || undefined,
      readingTimeMinutes: readingTime,
      views: 0,
      isPremium: data.isPremium || false,
      seoTitle: data.seoTitle?.trim() || data.title,
      seoDescription: data.seoDescription?.trim() || excerpt,
      featured: data.featured || false
    };

    const docRef = await addDoc(collection(db, RESOURCES_COLLECTION), resourcePost);
    console.log('Resource post created:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating resource post:', error);
    throw error;
  }
}

/**
 * Update an existing resource post
 */
export async function updateResourcePost(id: string, data: ResourceFormData): Promise<void> {
  try {
    const docRef = doc(db, RESOURCES_COLLECTION, id);
    const now = new Date();
    
    const readingTime = calculateReadingTime(data.content);
    const excerpt = data.excerpt || extractExcerpt(data.content);

    const updates = {
      title: data.title.trim(),
      subtitle: data.subtitle?.trim() || undefined,
      slug: data.slug || generateSlug(data.title),
      content: data.content,
      excerpt,
      imageUrl: data.imageUrl?.trim() || undefined,
      imageAlt: data.imageAlt?.trim() || undefined,
      status: data.status,
      scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
      updatedAt: now,
      tags: data.tags.filter(tag => tag.trim()).map(tag => tag.trim()),
      category: data.category?.trim() || undefined,
      readingTimeMinutes: readingTime,
      isPremium: data.isPremium || false,
      seoTitle: data.seoTitle?.trim() || data.title,
      seoDescription: data.seoDescription?.trim() || excerpt,
      featured: data.featured || false
    };

    // If changing from draft to published, set publishedAt
    if (data.status === 'published') {
      const currentDoc = await getDoc(docRef);
      const currentData = currentDoc.data();
      if (currentData?.status !== 'published') {
        (updates as any).publishedAt = now;
      }
    }

    await updateDoc(docRef, updates);
    console.log('Resource post updated:', id);
  } catch (error) {
    console.error('Error updating resource post:', error);
    throw error;
  }
}

/**
 * Delete a resource post
 */
export async function deleteResourcePost(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, RESOURCES_COLLECTION, id));
    console.log('Resource post deleted:', id);
  } catch (error) {
    console.error('Error deleting resource post:', error);
    throw error;
  }
}

/**
 * Get a single resource post by ID
 */
export async function getResourcePost(id: string): Promise<ResourcePost | null> {
  try {
    const docRef = doc(db, RESOURCES_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        publishedAt: data.publishedAt?.toDate() || undefined,
        scheduledFor: data.scheduledFor?.toDate() || undefined,
      } as ResourcePost;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting resource post:', error);
    throw error;
  }
}

/**
 * Get a resource post by slug
 */
export async function getResourcePostBySlug(slug: string): Promise<ResourcePost | null> {
  try {
    const q = query(
      collection(db, RESOURCES_COLLECTION),
      where('slug', '==', slug),
      where('status', '==', 'published')
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        publishedAt: data.publishedAt?.toDate() || undefined,
        scheduledFor: data.scheduledFor?.toDate() || undefined,
      } as ResourcePost;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting resource post by slug:', error);
    throw error;
  }
}

/**
 * Get published resource posts with pagination and search
 */
export async function getPublishedResourcePosts(
  filters: ResourceSearchFilters = {},
  pageSize: number = 12,
  lastDoc?: any
): Promise<{ posts: ResourcePost[]; hasMore: boolean; lastDoc: any }> {
  try {
    let q = query(
      collection(db, RESOURCES_COLLECTION),
      where('status', '==', 'published'),
      orderBy('publishedAt', 'desc')
    );

    // Apply filters
    if (filters.category) {
      q = query(q, where('category', '==', filters.category));
    }
    
    if (filters.featured !== undefined) {
      q = query(q, where('featured', '==', filters.featured));
    }

    if (filters.tags && filters.tags.length > 0) {
      q = query(q, where('tags', 'array-contains-any', filters.tags));
    }

    // Pagination
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    
    q = query(q, limit(pageSize + 1)); // Get one extra to check if there are more

    const querySnapshot = await getDocs(q);
    const posts: ResourcePost[] = [];
    
    querySnapshot.docs.slice(0, pageSize).forEach((doc) => {
      const data = doc.data();
      posts.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        publishedAt: data.publishedAt?.toDate() || undefined,
        scheduledFor: data.scheduledFor?.toDate() || undefined,
      } as ResourcePost);
    });

    // Filter by search query (client-side for simplicity)
    let filteredPosts = posts;
    if (filters.query) {
      const searchQuery = filters.query.toLowerCase();
      filteredPosts = posts.filter(post => 
        post.title.toLowerCase().includes(searchQuery) ||
        post.subtitle?.toLowerCase().includes(searchQuery) ||
        post.excerpt.toLowerCase().includes(searchQuery) ||
        post.tags.some(tag => tag.toLowerCase().includes(searchQuery))
      );
    }

    const hasMore = querySnapshot.docs.length > pageSize;
    const newLastDoc = querySnapshot.docs.length > 0 ? querySnapshot.docs[Math.min(pageSize - 1, querySnapshot.docs.length - 1)] : null;

    return {
      posts: filteredPosts,
      hasMore,
      lastDoc: newLastDoc
    };
  } catch (error) {
    console.error('Error getting published resource posts:', error);
    throw error;
  }
}

/**
 * Get all resource posts for admin (with all statuses)
 */
export async function getAllResourcePosts(filters: ResourceSearchFilters = {}): Promise<ResourceListItem[]> {
  try {
    let q = query(
      collection(db, RESOURCES_COLLECTION),
      orderBy('updatedAt', 'desc')
    );

    // Apply status filter
    if (filters.status) {
      q = query(
        collection(db, RESOURCES_COLLECTION),
        where('status', '==', filters.status),
        orderBy('updatedAt', 'desc')
      );
    }

    const querySnapshot = await getDocs(q);
    const posts: ResourceListItem[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      posts.push({
        id: doc.id,
        title: data.title,
        status: data.status,
        publishedAt: data.publishedAt?.toDate() || undefined,
        views: data.views || 0,
        featured: data.featured || false,
        category: data.category,
        tags: data.tags || [],
        updatedAt: data.updatedAt?.toDate() || new Date(),
      });
    });

    return posts;
  } catch (error) {
    console.error('Error getting all resource posts:', error);
    throw error;
  }
}

/**
 * Increment view count for a resource post
 */
export async function incrementResourceViews(id: string): Promise<void> {
  try {
    const docRef = doc(db, RESOURCES_COLLECTION, id);
    await updateDoc(docRef, {
      views: increment(1)
    });
  } catch (error) {
    console.error('Error incrementing resource views:', error);
    // Don't throw - view tracking shouldn't break the user experience
  }
}

/**
 * Get resource statistics for admin dashboard
 */
export async function getResourceStats(): Promise<ResourceStats> {
  try {
    const allPostsQuery = query(collection(db, RESOURCES_COLLECTION));
    const publishedQuery = query(
      collection(db, RESOURCES_COLLECTION),
      where('status', '==', 'published')
    );
    const draftQuery = query(
      collection(db, RESOURCES_COLLECTION),
      where('status', '==', 'draft')
    );

    const [allPosts, publishedPosts, draftPosts] = await Promise.all([
      getDocs(allPostsQuery),
      getDocs(publishedQuery),
      getDocs(draftQuery)
    ]);

    let totalViews = 0;
    let mostViewedPost: { id: string; title: string; views: number } | undefined;
    const recentPosts: { id: string; title: string; publishedAt: Date; views: number }[] = [];

    publishedPosts.forEach((doc) => {
      const data = doc.data();
      const views = data.views || 0;
      totalViews += views;

      if (!mostViewedPost || views > mostViewedPost.views) {
        mostViewedPost = {
          id: doc.id,
          title: data.title,
          views
        };
      }

      if (data.publishedAt) {
        recentPosts.push({
          id: doc.id,
          title: data.title,
          publishedAt: data.publishedAt.toDate(),
          views
        });
      }
    });

    // Sort recent posts by date and take top 5
    recentPosts.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    recentPosts.splice(5);

    return {
      totalPosts: allPosts.size,
      publishedPosts: publishedPosts.size,
      draftPosts: draftPosts.size,
      totalViews,
      mostViewedPost,
      recentPosts
    };
  } catch (error) {
    console.error('Error getting resource stats:', error);
    throw error;
  }
}