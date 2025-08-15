import Link from 'next/link';
import { getAllPosts } from '@/lib/blog/posts';
import { Metadata } from 'next';
import Image from 'next/image';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Blog | Dōshi Sensei - Japanese Learning Insights',
  description: 'Expert tips, learning strategies, and insights for mastering Japanese with Dōshi Sensei. JLPT preparation, study techniques, and language learning advice.',
  openGraph: {
    title: 'Blog | Dōshi Sensei',
    description: 'Expert Japanese learning insights and strategies',
    url: 'https://doshisensei.com/blog',
    siteName: 'Dōshi Sensei',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog | Dōshi Sensei',
    description: 'Expert Japanese learning insights and strategies',
  },
  alternates: {
    canonical: 'https://doshisensei.com/blog',
  },
};

export default function BlogIndex() {
  const posts = getAllPosts();

  if (posts.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <h1 className="text-4xl font-bold text-foreground mb-8">Blog</h1>
          <div className="bg-card rounded-lg border border-border p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              No posts yet
            </h2>
            <p className="text-muted-foreground">
              Check back soon for Japanese learning insights!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-16">
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Dōshi Sensei Blog
          </h1>
          <p className="text-lg text-muted-foreground">
            Expert insights and strategies for mastering Japanese
          </p>
        </header>

        {/* Featured Post (first post) */}
        {posts[0] && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-6">Featured Post</h2>
            <Link href={`/blog/${posts[0].meta.slug}`}>
              <article className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-shadow group">
                {posts[0].meta.cover && (
                  <div className="aspect-[2/1] relative overflow-hidden bg-muted">
                    <img
                      src={posts[0].meta.cover}
                      alt={posts[0].meta.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <time dateTime={posts[0].meta.date}>
                      {new Date(posts[0].meta.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </time>
                    <span>•</span>
                    <span>{posts[0].meta.readingTime}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                    {posts[0].meta.title}
                  </h3>
                  {posts[0].meta.excerpt && (
                    <p className="text-muted-foreground line-clamp-2 mb-4">
                      {posts[0].meta.excerpt}
                    </p>
                  )}
                  {posts[0].meta.tags && posts[0].meta.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {posts[0].meta.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            </Link>
          </section>
        )}

        {/* Other Posts */}
        {posts.length > 1 && (
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-6">Recent Posts</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {posts.slice(1).map(({ meta }) => (
                <Link key={meta.slug} href={`/blog/${meta.slug}`}>
                  <article className="bg-card rounded-lg border border-border p-6 hover:shadow-md transition-shadow h-full group">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <time dateTime={meta.date}>
                        {new Date(meta.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </time>
                      <span>•</span>
                      <span>{meta.readingTime}</span>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {meta.title}
                    </h3>
                    {meta.excerpt && (
                      <p className="text-muted-foreground line-clamp-3 mb-4">
                        {meta.excerpt}
                      </p>
                    )}
                    {meta.tags && meta.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-auto">
                        {meta.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}