import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import readingTime from 'reading-time';

export type PostMeta = {
  title: string;
  slug: string;
  date: string;
  tags?: string[];
  excerpt?: string;
  cover?: string;
  seoTitle?: string;
  seoDescription?: string;
  author?: string;
  authorImage?: string;
  readingTime: string;
  status?: 'draft' | 'published' | 'scheduled';
  publishDate?: string;
  lastModified?: string;
  canonical?: string;
  ogImage?: string;
};

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');

// Check if posts directory exists
function ensurePostsDirectory() {
  if (!fs.existsSync(POSTS_DIR)) {
    fs.mkdirSync(POSTS_DIR, { recursive: true });
  }
}

function fileToSlug(filename: string) {
  // Remove date prefix if present (YYYY-MM-DD-) and extension
  return filename
    .replace(/^\d{4}-\d{2}-\d{2}-/, '')
    .replace(/\.mdx?$/i, '');
}

export function getAllPostSlugs(): string[] {
  ensurePostsDirectory();
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))
    .map(fileToSlug);
}

export function getPostBySlug(slug: string) {
  ensurePostsDirectory();
  const files = fs.readdirSync(POSTS_DIR);
  const file = files.find((f) => fileToSlug(f) === slug);
  
  if (!file) return null;

  const fullPath = path.join(POSTS_DIR, file);
  const source = fs.readFileSync(fullPath, 'utf8');
  const { content, data } = matter(source);

  const meta: PostMeta = {
    title: data.title ?? slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    slug: data.slug ?? slug,
    date: data.date ?? new Date().toISOString().split('T')[0],
    tags: data.tags ?? [],
    excerpt: data.excerpt ?? '',
    cover: data.cover ?? '',
    seoTitle: data.seoTitle ?? data.title ?? slug,
    seoDescription: data.seoDescription ?? data.excerpt ?? '',
    author: data.author ?? 'Dōshi Sensei Team',
    authorImage: data.authorImage ?? '/images/default-author.png',
    readingTime: readingTime(content).text,
    status: data.status ?? 'published',
    publishDate: data.publishDate ?? data.date,
    lastModified: data.lastModified ?? data.date,
    canonical: data.canonical,
    ogImage: data.ogImage ?? data.cover,
  };

  return { meta, content };
}

export function getAllPosts(includeScheduled = false): { meta: PostMeta }[] {
  ensurePostsDirectory();
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md') || f.endsWith('.mdx'));
  
  const posts = files.map((file) => {
    const fullPath = path.join(POSTS_DIR, file);
    const source = fs.readFileSync(fullPath, 'utf8');
    const { content, data } = matter(source);
    const slug = fileToSlug(file);
    
    const meta: PostMeta = {
      title: data.title ?? slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      slug: data.slug ?? slug,
      date: data.date ?? new Date().toISOString().split('T')[0],
      tags: data.tags ?? [],
      excerpt: data.excerpt ?? '',
      cover: data.cover ?? '',
      seoTitle: data.seoTitle ?? data.title ?? slug,
      seoDescription: data.seoDescription ?? data.excerpt ?? '',
      author: data.author ?? 'Dōshi Sensei Team',
      authorImage: data.authorImage ?? '/images/default-author.png',
      readingTime: readingTime(content).text,
      status: data.status ?? 'published',
      publishDate: data.publishDate ?? data.date,
      lastModified: data.lastModified ?? data.date,
      canonical: data.canonical,
      ogImage: data.ogImage ?? data.cover,
    };
    
    return { meta };
  });

  // Filter posts based on status and schedule
  const now = new Date();
  const filteredPosts = posts.filter(({ meta }) => {
    if (meta.status === 'draft') return false;
    if (meta.status === 'scheduled' && !includeScheduled) {
      const publishDate = new Date(meta.publishDate || meta.date);
      return publishDate <= now;
    }
    return true;
  });

  // Sort by date (newest first)
  return filteredPosts.sort((a, b) => 
    new Date(b.meta.date).getTime() - new Date(a.meta.date).getTime()
  );
}

export function getRelatedPosts(currentSlug: string, tags: string[] = [], limit = 3): { meta: PostMeta }[] {
  const allPosts = getAllPosts();
  
  // Filter out current post
  const otherPosts = allPosts.filter(({ meta }) => meta.slug !== currentSlug);
  
  // Score posts by tag overlap
  const scoredPosts = otherPosts.map(post => {
    const score = post.meta.tags?.filter(tag => tags.includes(tag)).length || 0;
    return { post, score };
  });
  
  // Sort by score and return top N
  return scoredPosts
    .sort((a, b) => b.score - a.score || 
      new Date(b.post.meta.date).getTime() - new Date(a.post.meta.date).getTime())
    .slice(0, limit)
    .map(({ post }) => post);
}