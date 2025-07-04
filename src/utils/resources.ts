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

    // Build the resource object with only defined values
    const resourcePost: any = {
      title: data.title.trim(),
      slug,
      content: data.content,
      excerpt,
      author: {
        id: authorId,
        name: 'Admin', // You can enhance this with actual user data
        email: '' // You can enhance this with actual user data
      },
      status: data.status,
      createdAt: now,
      updatedAt: now,
      tags: data.tags.filter(tag => tag.trim()).map(tag => tag.trim()),
      readingTimeMinutes: readingTime,
      views: 0,
      isPremium: data.isPremium || false,
      seoTitle: data.seoTitle?.trim() || data.title,
      seoDescription: data.seoDescription?.trim() || excerpt,
      featured: data.featured || false
    };

    // Add optional fields only if they have values
    if (data.subtitle?.trim()) {
      resourcePost.subtitle = data.subtitle.trim();
    }
    if (data.imageUrl?.trim()) {
      resourcePost.imageUrl = data.imageUrl.trim();
    }
    if (data.imageAlt?.trim()) {
      resourcePost.imageAlt = data.imageAlt.trim();
    }
    if (data.category?.trim()) {
      resourcePost.category = data.category.trim();
    }
    if (data.status === 'published') {
      resourcePost.publishedAt = now;
    }
    if (data.scheduledFor) {
      resourcePost.scheduledFor = new Date(data.scheduledFor);
    }

    const docRef = await addDoc(collection(db, RESOURCES_COLLECTION), resourcePost);
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

    // Build the updates object with only defined values
    const updates: any = {
      title: data.title.trim(),
      slug: data.slug || generateSlug(data.title),
      content: data.content,
      excerpt,
      status: data.status,
      updatedAt: now,
      tags: data.tags.filter(tag => tag.trim()).map(tag => tag.trim()),
      readingTimeMinutes: readingTime,
      isPremium: data.isPremium || false,
      seoTitle: data.seoTitle?.trim() || data.title,
      seoDescription: data.seoDescription?.trim() || excerpt,
      featured: data.featured || false
    };

    // Add optional fields only if they have values
    if (data.subtitle?.trim()) {
      updates.subtitle = data.subtitle.trim();
    } else {
      updates.subtitle = null; // Explicitly remove the field
    }

    if (data.imageUrl?.trim()) {
      updates.imageUrl = data.imageUrl.trim();
    } else {
      updates.imageUrl = null;
    }

    if (data.imageAlt?.trim()) {
      updates.imageAlt = data.imageAlt.trim();
    } else {
      updates.imageAlt = null;
    }

    if (data.category?.trim()) {
      updates.category = data.category.trim();
    } else {
      updates.category = null;
    }

    if (data.scheduledFor) {
      updates.scheduledFor = new Date(data.scheduledFor);
    } else {
      updates.scheduledFor = null;
    }

    // If changing from draft to published, set publishedAt
    if (data.status === 'published') {
      const currentDoc = await getDoc(docRef);
      const currentData = currentDoc.data();
      if (currentData?.status !== 'published') {
        (updates as any).publishedAt = now;
      }
    }

    await updateDoc(docRef, updates);
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
        createdAt: (data.createdAt && typeof data.createdAt.toDate === 'function') ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
        updatedAt: (data.updatedAt && typeof data.updatedAt.toDate === 'function') ? data.updatedAt.toDate() : new Date(data.updatedAt || Date.now()),
        publishedAt: (data.publishedAt && typeof data.publishedAt.toDate === 'function') ? data.publishedAt.toDate() : (data.publishedAt ? new Date(data.publishedAt) : undefined),
        scheduledFor: (data.scheduledFor && typeof data.scheduledFor.toDate === 'function') ? data.scheduledFor.toDate() : (data.scheduledFor ? new Date(data.scheduledFor) : undefined),
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
        createdAt: (data.createdAt && typeof data.createdAt.toDate === 'function') ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
        updatedAt: (data.updatedAt && typeof data.updatedAt.toDate === 'function') ? data.updatedAt.toDate() : new Date(data.updatedAt || Date.now()),
        publishedAt: (data.publishedAt && typeof data.publishedAt.toDate === 'function') ? data.publishedAt.toDate() : (data.publishedAt ? new Date(data.publishedAt) : undefined),
        scheduledFor: (data.scheduledFor && typeof data.scheduledFor.toDate === 'function') ? data.scheduledFor.toDate() : (data.scheduledFor ? new Date(data.scheduledFor) : undefined),
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
    // Get all resources and filter in memory to avoid composite index requirements
    const q = query(
      collection(db, RESOURCES_COLLECTION),
      orderBy('createdAt', 'desc'), // Use createdAt which doesn't require composite index
      limit(pageSize * 3) // Get more documents to account for filtering
    );

    const querySnapshot = await getDocs(q);
    const allPosts: ResourcePost[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();

      // Only include published posts
      if (data.status !== 'published') {
        return;
      }

      // Apply category filter
      if (filters.category && data.category !== filters.category) {
        return;
      }

      // Apply featured filter
      if (filters.featured !== undefined && data.featured !== filters.featured) {
        return;
      }

      // Apply tags filter
      if (filters.tags && filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(tag =>
          (data.tags || []).includes(tag)
        );
        if (!hasMatchingTag) {
          return;
        }
      }

      allPosts.push({
        id: doc.id,
        ...data,
        createdAt: (data.createdAt && typeof data.createdAt.toDate === 'function') ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
        updatedAt: (data.updatedAt && typeof data.updatedAt.toDate === 'function') ? data.updatedAt.toDate() : new Date(data.updatedAt || Date.now()),
        publishedAt: (data.publishedAt && typeof data.publishedAt.toDate === 'function') ? data.publishedAt.toDate() : (data.publishedAt ? new Date(data.publishedAt) : undefined),
        scheduledFor: (data.scheduledFor && typeof data.scheduledFor.toDate === 'function') ? data.scheduledFor.toDate() : (data.scheduledFor ? new Date(data.scheduledFor) : undefined),
      } as ResourcePost);
    });

    // Sort by publishedAt date (newest first)
    allPosts.sort((a, b) => {
      const dateA = a.publishedAt || a.createdAt;
      const dateB = b.publishedAt || b.createdAt;
      return dateB.getTime() - dateA.getTime();
    });

    // Apply search filter
    let filteredPosts = allPosts;
    if (filters.query) {
      const searchQuery = filters.query.toLowerCase();
      filteredPosts = allPosts.filter(post =>
        post.title.toLowerCase().includes(searchQuery) ||
        post.subtitle?.toLowerCase().includes(searchQuery) ||
        post.excerpt.toLowerCase().includes(searchQuery) ||
        post.tags.some(tag => tag.toLowerCase().includes(searchQuery))
      );
    }

    // Apply pagination
    const paginatedPosts = filteredPosts.slice(0, pageSize);
    const hasMore = filteredPosts.length > pageSize;

    return {
      posts: paginatedPosts,
      hasMore,
      lastDoc: null // We're not using cursor-based pagination anymore
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
    // Always get all resources ordered by updatedAt
    // We'll filter by status in memory to avoid composite index requirements
    const q = query(
      collection(db, RESOURCES_COLLECTION),
      orderBy('updatedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const posts: ResourceListItem[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();

      // Apply status filter in memory if specified
      if (filters.status && data.status !== filters.status) {
        return; // Skip this document if it doesn't match the status filter
      }

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
