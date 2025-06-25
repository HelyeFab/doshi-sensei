'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ResourcePost, ResourceSearchFilters, RESOURCE_CATEGORIES } from '@/types/resources';
import { getPublishedResourcePosts } from '@/utils/resources';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import CompanionTrigger from '@/components/CompanionTrigger';

export default function ResourcesPage() {
  const searchParams = useSearchParams();
  const [resources, setResources] = useState<ResourcePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [categoryFilter, setCategoryFilter] = useState<string>(searchParams.get('category') || '');
  const [featuredOnly, setFeaturedOnly] = useState(false);

  const loadResources = useCallback(async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const filters: ResourceSearchFilters = {};
      
      if (searchQuery) filters.query = searchQuery;
      if (categoryFilter) filters.category = categoryFilter;
      if (featuredOnly) filters.featured = true;

      const { posts, hasMore: hasMorePosts, lastDoc: newLastDoc } = await getPublishedResourcePosts(
        filters,
        12,
        isLoadMore ? lastDoc : undefined
      );

      if (isLoadMore) {
        setResources(prev => [...prev, ...posts]);
      } else {
        setResources(posts);
      }

      setHasMore(hasMorePosts);
      setLastDoc(newLastDoc);
    } catch (error) {
      console.error('Error loading resources:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [searchQuery, categoryFilter, featuredOnly, lastDoc]);

  // Initial load
  useEffect(() => {
    loadResources();
  }, [searchQuery, categoryFilter, featuredOnly]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLastDoc(null);
    loadResources();
  };

  // Handle filter changes
  const handleCategoryChange = (category: string) => {
    setCategoryFilter(category);
    setLastDoc(null);
  };

  const handleFeaturedToggle = () => {
    setFeaturedOnly(!featuredOnly);
    setLastDoc(null);
  };

  // Load more resources
  const handleLoadMore = () => {
    if (hasMore && !loadingMore) {
      loadResources(true);
    }
  };

  const getReadingTimeText = (minutes: number) => {
    return minutes === 1 ? '1 min read' : `${minutes} min read`;
  };

  return (
    <>
      {/* Hero Section */}
      <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />
        <CompanionTrigger />
      </div>

      <div className="container mx-auto px-4 py-6 min-h-screen pb-24 md:pb-8">
        <PageHeader title="Resources" showBackButton={true} />

        {/* Search and Filters */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-card rounded-lg p-6 border border-border space-y-4">
            {/* Search Bar */}
            <form onSubmit={handleSearch}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search resources..."
                  className="flex-1 px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                />
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Category:</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="px-3 py-1 border border-border rounded-lg bg-background text-foreground text-sm"
                >
                  <option value="">All Categories</option>
                  {RESOURCE_CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={featuredOnly}
                  onChange={handleFeaturedToggle}
                  className="rounded"
                />
                <span className="text-sm">Featured only</span>
              </label>

              {(searchQuery || categoryFilter || featuredOnly) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('');
                    setFeaturedOnly(false);
                    setLastDoc(null);
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Resources Grid */}
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-muted-foreground">Loading resources...</p>
            </div>
          ) : resources.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold mb-2">No resources found</h3>
              <p className="text-muted-foreground">
                {searchQuery || categoryFilter || featuredOnly 
                  ? 'Try adjusting your search criteria or filters.'
                  : 'Check back soon for new resources and articles!'}
              </p>
            </div>
          ) : (
            <>
              {/* Resource Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {resources.map((resource) => (
                  <article key={resource.id} className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-shadow">
                    {resource.imageUrl && (
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={resource.imageUrl}
                          alt={resource.imageAlt || resource.title}
                          className="w-full h-full object-cover"
                        />
                        {resource.featured && (
                          <div className="absolute top-3 left-3">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                              Featured
                            </span>
                          </div>
                        )}
                        {resource.isPremium && (
                          <div className="absolute top-3 right-3">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                              Premium
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="p-6">
                      {!resource.imageUrl && (
                        <div className="flex justify-between items-start mb-3">
                          {resource.featured && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                              Featured
                            </span>
                          )}
                          {resource.isPremium && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                              Premium
                            </span>
                          )}
                        </div>
                      )}

                      <div className="mb-3">
                        {resource.category && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary mb-2">
                            {resource.category}
                          </span>
                        )}
                        <h2 className="text-xl font-semibold text-foreground mb-1 line-clamp-2">
                          {resource.title}
                        </h2>
                        {resource.subtitle && (
                          <p className="text-muted-foreground text-sm line-clamp-1">
                            {resource.subtitle}
                          </p>
                        )}
                      </div>

                      <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                        {resource.excerpt}
                      </p>

                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                        <span>{getReadingTimeText(resource.readingTimeMinutes)}</span>
                        <span>{resource.publishedAt && formatDistanceToNow(resource.publishedAt, { addSuffix: true })}</span>
                      </div>

                      {resource.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {resource.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-muted text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                          {resource.tags.length > 3 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                              +{resource.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      <Link
                        href={`/resources/${resource.slug}`}
                        className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
                      >
                        Read More
                        <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </article>
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingMore ? 'Loading...' : 'Load More Resources'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}