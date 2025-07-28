'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ResourcePost } from '@/types/resources';
import { getResourcePostBySlug, incrementResourceViews } from '@/utils/resources';
import { marked } from 'marked';
import { formatDistanceToNow, format } from 'date-fns';
import Link from 'next/link'
import { SmartNavigationLink } from '@/components/navigation/SmartNavigationLink';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import { useStrings } from '@/contexts/LanguageContext';
import { MobileAwareContainer } from '@/components/layout/MobileAwareContainer';

export const metadata = {
  title: '[slug]',
  description: '[slug] - The ultimate Japanese learning platform: Master verb conjugations, study kanji through JLPT levels and mood boards, practice with Jisho/WaniKani vocabulary, import Anki decks, read news articles and AI stories, practice YouTube shadowing, play learning games, access grammar resources, and build fluency with our comprehensive suite of interactive tools.',
  openGraph: {
    title: '[slug] | Doshi Sensei',
    description: '[slug] - The ultimate Japanese learning platform: Master verb conjugations, study kanji through JLPT levels and mood boards, practice with Jisho/WaniKani vocabulary, import Anki decks, read news articles and AI stories, practice YouTube shadowing, play learning games, access grammar resources, and build fluency with our comprehensive suite of interactive tools.',
  },
};

export default function ResourcePostPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [resource, setResource] = useState<ResourcePost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      loadResource();
    }
  }, [slug]);

  const loadResource = async () => {
    try {
      setLoading(true);
      setError(null);

      const resourceData = await getResourcePostBySlug(slug);

      if (!resourceData) {
        setError('Resource not found');
        return;
      }

      setResource(resourceData);

      // Track view count (don't await to avoid blocking)
      incrementResourceViews(resourceData.id);
    } catch (error) {
      console.error('Error loading resource:', error);
      setError('Failed to load resource');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!resource) return;

    const shareData = {
      title: resource.title,
      text: resource.excerpt,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        setInfoMessage('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const getReadingTimeText = (minutes: number) => {
    return minutes === 1 ? '1 min read' : `${minutes} min read`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SmartPageHeader title="Loading..." backHref="/resources" />
        <MobileAwareContainer className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto text-center py-12">
            <div className="text-6xl mb-4">📖</div>
            <p className="text-muted-foreground">Loading resource...</p>
          </div>
        </MobileAwareContainer>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SmartPageHeader title="Resource Not Found" backHref="/resources" />
        <MobileAwareContainer className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto text-center py-12">
            <div className="text-6xl mb-4">📄</div>
            <h2 className="text-2xl font-semibold mb-4">Resource Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The resource you're looking for doesn't exist or has been moved.
            </p>
            <SmartNavigationLink href="/resources"
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
             title="Browse All Resources">
              Browse All Resources
            </SmartNavigationLink>
          </div>
        </MobileAwareContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SmartPageHeader title={resource.title} backHref="/resources" />
      
      {/* Hero Section */}
      {resource.imageUrl && (
        <div className="relative w-full h-[40vh] min-h-[300px] overflow-hidden">
          <img
            src={resource.imageUrl}
            alt={resource.imageAlt || resource.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}

      <MobileAwareContainer className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Back Navigation */}
          <div className="mb-6">
            <SmartNavigationLink href="/resources"
              className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
             title={strings.resources.backToResources || "Back to Resources"}>
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Resources
            </SmartNavigationLink>
          </div>

          {/* Article Header */}
          <header className="mb-8">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {resource.category && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
                  {resource.category}
                </span>
              )}
              {resource.featured && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                  Featured
                </span>
              )}
              {resource.isPremium && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {useStrings().subscriptions.plans.monthly.name}
                </span>
              )}
            </div>

            <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight">
              {resource.title}
            </h1>

            {resource.subtitle && (
              <p className="text-xl text-muted-foreground mb-6">
                {resource.subtitle}
              </p>
            )}

            {/* Article Meta */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground mb-6">
              <div>
                By <span className="font-medium">{resource.author.name}</span>
              </div>
              <div>
                {resource.publishedAt && format(resource.publishedAt, 'MMMM d, yyyy')}
              </div>
              <div>
                {getReadingTimeText(resource.readingTimeMinutes)}
              </div>
              <div>
                {resource.views.toLocaleString()} views
              </div>
            </div>

            {/* Share Button */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleShare}
                className="inline-flex items-center px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                Share
              </button>
            </div>
          </header>

          {/* External Resource CTA */}
          {resource.externalUrl && (
            <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    🔗 External Resource
                  </h3>
                  <p className="text-blue-700 dark:text-blue-300 text-sm">
                    Click below to visit the original resource
                  </p>
                </div>
                <a
                  href={resource.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Visit Resource
                  <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          )}

          {/* Article Content */}
          <article className="prose prose-lg max-w-none dark:prose-invert">
            <div dangerouslySetInnerHTML={{ __html: marked(resource.content) as string }} />
          </article>

          {/* Article Footer */}
          <footer className="mt-12 pt-8 border-t border-border">
            {/* Tags */}
            {resource.tags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {resource.tags.map((tag) => (
                    <SmartNavigationLink key={tag}
                      href={`/resources?q=${encodeURIComponent(tag)}`}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                     title={strings.resources.backToResources || "Back to Resources"}>
                      {tag}
                    </SmartNavigationLink>
                  ))}
                </div>
              </div>
            )}

            {/* Author Info */}
            <div className="bg-card rounded-lg p-6 border border-border">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-primary font-semibold">
                    {resource.author.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">
                    {resource.author.name}
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    Published {resource.publishedAt && formatDistanceToNow(resource.publishedAt, { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="mt-8 text-center">
              <SmartNavigationLink href="/resources"
                className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
               title={strings.resources.backToResources || "Back to Resources"}>
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to All Resources
              </SmartNavigationLink>
            </div>
          </footer>
        </div>
      </MobileAwareContainer>

      {/* Info Message Modal */}
      {infoMessage && (
        <ConfirmationDialog
          isOpen={!!infoMessage}
          title="Info"
          message={infoMessage}
          confirmText="OK"
          cancelText=""
          isDestructive={false}
          onConfirm={() => setInfoMessage(null)}
          onCancel={() => setInfoMessage(null)}
          loading={false}
        />
      )}
    </div>
  );
}
