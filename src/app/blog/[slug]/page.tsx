import { getAllPostSlugs, getPostBySlug, getRelatedPosts } from '@/lib/blog/posts';
import { mdxToHtml } from '@/lib/blog/mdx';
import MarkdownContent from '@/components/blog/MarkdownContent';
import Link from 'next/link';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';

export const revalidate = 60;

export async function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  
  if (!post) {
    return {
      title: 'Post Not Found | Dōshi Sensei',
    };
  }

  const { meta } = post;
  const url = `https://doshisensei.com/blog/${meta.slug}`;

  return {
    title: `${meta.seoTitle || meta.title} | Dōshi Sensei`,
    description: meta.seoDescription || meta.excerpt,
    authors: [{ name: meta.author }],
    openGraph: {
      title: meta.seoTitle || meta.title,
      description: meta.seoDescription || meta.excerpt,
      url,
      siteName: 'Dōshi Sensei',
      type: 'article',
      publishedTime: meta.date,
      modifiedTime: meta.lastModified,
      authors: [meta.author || 'Dōshi Sensei Team'],
      images: meta.ogImage ? [
        {
          url: meta.ogImage,
          width: 1200,
          height: 630,
          alt: meta.title,
        }
      ] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.seoTitle || meta.title,
      description: meta.seoDescription || meta.excerpt,
      images: meta.ogImage ? [meta.ogImage] : undefined,
    },
    alternates: {
      canonical: meta.canonical || url,
    },
  };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  
  if (!post) {
    notFound();
  }

  const { meta, content } = post;
  const mdx = await mdxToHtml(content);
  const relatedPosts = getRelatedPosts(meta.slug, meta.tags);

  // JSON-LD structured data for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: meta.title,
    description: meta.seoDescription || meta.excerpt,
    image: meta.ogImage || meta.cover,
    datePublished: meta.date,
    dateModified: meta.lastModified || meta.date,
    author: {
      '@type': 'Person',
      name: meta.author || 'Dōshi Sensei Team',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Dōshi Sensei',
      logo: {
        '@type': 'ImageObject',
        url: 'https://doshisensei.com/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://doshisensei.com/blog/${meta.slug}`,
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      
      <article className="mx-auto max-w-4xl px-4 py-16">
        {/* Breadcrumb */}
        <nav className="mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-muted-foreground">
            <li>
              <Link href="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href="/blog" className="hover:text-foreground transition-colors">
                Blog
              </Link>
            </li>
            <li>/</li>
            <li className="text-foreground truncate">{meta.title}</li>
          </ol>
        </nav>

        {/* Article Header */}
        <header className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            {meta.title}
          </h1>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
            <div className="flex items-center gap-2">
              {meta.authorImage && (
                <img
                  src={meta.authorImage}
                  alt={meta.author}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span>{meta.author}</span>
            </div>
            <span>•</span>
            <time dateTime={meta.date}>
              {new Date(meta.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </time>
            <span>•</span>
            <span>{meta.readingTime}</span>
          </div>

          {meta.tags && meta.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {meta.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 text-sm rounded-full bg-primary/10 text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {meta.excerpt && (
            <p className="text-lg text-muted-foreground italic border-l-4 border-primary/50 pl-4">
              {meta.excerpt}
            </p>
          )}
        </header>

        {/* Cover Image */}
        {meta.cover && (
          <div className="mb-10 -mx-4 md:mx-0 md:rounded-lg overflow-hidden bg-muted">
            <img
              src={meta.cover}
              alt={meta.title}
              className="w-full h-auto object-cover"
              loading="eager"
            />
          </div>
        )}

        {/* Article Content */}
        <MarkdownContent content={mdx} />

        {/* Article Footer */}
        <footer className="mt-12 pt-8 border-t border-border">
          {/* Author Bio */}
          <div className="bg-card rounded-lg p-6 mb-8">
            <div className="flex items-start gap-4">
              <img
                src={meta.authorImage || '/doshi.png'}
                alt={meta.author}
                className="w-16 h-16 rounded-full object-cover"
              />
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  About {meta.author}
                </h3>
                <p className="text-muted-foreground text-sm">
                  Part of the Dōshi Sensei team, dedicated to making Japanese learning 
                  accessible and enjoyable for everyone.
                </p>
              </div>
            </div>
          </div>

          {/* Share Section */}
          <div className="mb-8">
            <h3 className="font-semibold text-foreground mb-4">Share this post</h3>
            <div className="flex gap-3">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(meta.title)}&url=${encodeURIComponent(`https://doshisensei.com/blog/${meta.slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-card rounded-lg border border-border hover:bg-muted transition-colors text-sm"
              >
                Share on X
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://doshisensei.com/blog/${meta.slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-card rounded-lg border border-border hover:bg-muted transition-colors text-sm"
              >
                Share on LinkedIn
              </a>
            </div>
          </div>

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <div>
              <h3 className="text-2xl font-semibold text-foreground mb-6">
                Related Posts
              </h3>
              <div className="grid gap-4 md:grid-cols-3">
                {relatedPosts.map(({ meta: relatedMeta }) => (
                  <Link key={relatedMeta.slug} href={`/blog/${relatedMeta.slug}`}>
                    <article className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow h-full group">
                      <time className="text-xs text-muted-foreground">
                        {new Date(relatedMeta.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </time>
                      <h4 className="font-medium text-foreground mt-2 mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {relatedMeta.title}
                      </h4>
                      {relatedMeta.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {relatedMeta.excerpt}
                        </p>
                      )}
                    </article>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </footer>
      </article>
    </div>
  );
}