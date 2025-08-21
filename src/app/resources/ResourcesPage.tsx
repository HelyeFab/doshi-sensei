'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ResourcePost, ResourceSearchFilters } from '@/types/resources';
import { getPublishedResourcePosts, getResourceCategoriesAndTags } from '@/utils/resources';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link'
import { SmartNavigationLink } from '@/components/navigation/SmartNavigationLink';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import { getResourceColorTheme, getResourceIcon, getCategoryEmoji } from '@/utils/resourceVisuals';
import { useStrings } from '@/contexts/LanguageContext';
import { MobileAwareContainer } from '@/components/layout/MobileAwareContainer';
import { ExternalImage } from '@/components/ui/OptimizedImage';
import { DesktopContainer } from '@/components/layout/DesktopContainer';

function ResourcesContent() {
  const searchParams = useSearchParams();
  const strings = useStrings();
  const [resources, setResources] = useState<ResourcePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [categoryFilter, setCategoryFilter] = useState<string>(searchParams.get('category') || '');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

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

  // Load available categories and tags
  useEffect(() => {
    const loadCategories = async () => {
      const categories = await getResourceCategoriesAndTags();
      setAvailableCategories(categories);
    };
    loadCategories();
  }, []);

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
    <div className="min-h-screen bg-background">
      <SmartPageHeader title="Resources" backHref="/" />
      
      <DesktopContainer>
        <MobileAwareContainer className="container mx-auto px-4 py-6">

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
                  {availableCategories.map(category => (
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
              <p className="text-muted-foreground">{strings.loading.loadingResources}</p>
            </div>
          ) : resources.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold mb-2">{strings.errors.noResourcesFound}</h3>
              <p className="text-muted-foreground">
                {searchQuery || categoryFilter || featuredOnly
                  ? 'Try adjusting your search criteria or filters.'
                  : 'Check back soon for new resources and articles!'}
              </p>
            </div>
          ) : (
            <>
              {/* Resource Cards Grid - Instagram Style */}
              <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4 mb-8">
                {resources.map((resource) => {
                  const colorTheme = getResourceColorTheme(resource.id);
                  const categoryEmoji = getCategoryEmoji(resource.category, resource.tags);
                  const iconPath = getResourceIcon(resource.id);

                  // Render pill-style resources
                  if (resource.isPillStyle) {
                    return (
                      <div key={resource.id} className="break-inside-avoid">
                        <SmartNavigationLink href={`/resources/${resource.slug}`}
                          className={`block ${colorTheme.bg} ${colorTheme.border} ${colorTheme.shadow} rounded-full border-2 p-4 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.02] group`}
                         title={resource.title}>
                          <div className="flex items-center gap-3">
                            {/* Icon or Emoji */}
                            <div className="flex-shrink-0">
                              <div className="w-12 h-12 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-2xl shadow-md border border-white/50">
                                {categoryEmoji}
                              </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <h3 className={`font-bold ${colorTheme.text} ${colorTheme.textShadow} truncate`}>
                                {resource.title}
                              </h3>
                              {resource.category && (
                                <span className={`text-xs ${colorTheme.text} ${colorTheme.textShadow} opacity-80`}>
                                  {resource.category}
                                </span>
                              )}
                            </div>

                            {/* Arrow */}
                            <svg className={`w-5 h-5 ${colorTheme.text} ${colorTheme.textShadow} flex-shrink-0 transition-transform group-hover:translate-x-1`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>

                          {/* Badges */}
                          <div className="flex gap-2 mt-2 ml-15">
                            {resource.featured && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-400/80 text-yellow-900">
                                ⭐ Featured
                              </span>
                            )}
                            {resource.isPremium && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/60 text-gray-800">
                                💎 Premium
                              </span>
                            )}
                          </div>
                        </SmartNavigationLink>
                      </div>
                    );
                  }

                  // Regular card style
                  return (
                    <article
                      key={resource.id}
                      className={`break-inside-avoid ${colorTheme.bg} ${colorTheme.border} ${colorTheme.shadow} rounded-xl border-2 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.02]`}
                    >
                      {resource.imageUrl ? (
                        <div className="relative h-48 overflow-hidden">
                          <ExternalImage
                            src={resource.imageUrl}
                            alt={resource.imageAlt || resource.title}
                            className="w-full h-full object-cover"
                            width={384}
                            height={192}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

                          {/* Emoji overlay */}
                          <div className="absolute top-3 left-3">
                            <div className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-lg shadow-lg">
                              {categoryEmoji}
                            </div>
                          </div>

                          {/* Status badges */}
                          <div className="absolute top-3 right-3 flex flex-col gap-1">
                            {resource.featured && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-400 text-yellow-900 shadow-lg">
                                ⭐ Featured
                              </span>
                            )}
                            {resource.isPremium && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                💎 {strings.subscriptions.plans.monthly.name}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="relative h-32 overflow-hidden flex items-center justify-center">
                          {/* Icon Background */}
                          <div className="absolute inset-0 opacity-10">
                            <img
                              src={iconPath}
                              alt="Resource icon"
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                const target = e.target as HTMLElement;
                                target.style.display = 'none';
                              }}
                            />
                          </div>

                          {/* Emoji */}
                          <div className="relative z-10">
                            <div className="w-16 h-16 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-3xl shadow-lg border border-white/50">
                              {categoryEmoji}
                            </div>
                          </div>

                          {/* Status badges */}
                          <div className="absolute top-3 right-3 flex flex-col gap-1">
                            {resource.featured && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-400 text-yellow-900 shadow-lg">
                                ⭐ Featured
                              </span>
                            )}
                            {resource.isPremium && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                💎 {strings.subscriptions.plans.monthly.name}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="p-6">
                        <div className="mb-4">
                          {resource.category && (
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-black/20 ${colorTheme.text} ${colorTheme.textShadow} mb-3 shadow-sm`}>
                              {resource.category}
                            </span>
                          )}
                          <h2 className={`text-xl font-bold ${colorTheme.text} ${colorTheme.textShadow} mb-2 line-clamp-2 leading-tight`}>
                            {resource.title}
                          </h2>
                          {resource.subtitle && (
                            <p className={`${colorTheme.text} ${colorTheme.textShadow} text-sm line-clamp-1 mb-2`}>
                              {resource.subtitle}
                            </p>
                          )}
                        </div>

                        <p className={`${colorTheme.text} ${colorTheme.textShadow} text-sm mb-4 line-clamp-3 leading-relaxed`}>
                          {resource.excerpt}
                        </p>

                        <div className={`flex items-center justify-between text-xs ${colorTheme.text} ${colorTheme.textShadow} mb-4`}>
                          <div className="flex items-center gap-1">
                            <span>📖</span>
                            <span>{getReadingTimeText(resource.readingTimeMinutes)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>🕒</span>
                            <span>{resource.publishedAt && formatDistanceToNow(resource.publishedAt, { addSuffix: true })}</span>
                          </div>
                        </div>

                        {resource.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-5">
                            {resource.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className={`inline-flex items-center px-2 py-1 rounded-md text-xs bg-black/20 ${colorTheme.text} ${colorTheme.textShadow} font-medium`}
                              >
                                #{tag}
                              </span>
                            ))}
                            {resource.tags.length > 3 && (
                              <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs bg-black/20 ${colorTheme.text} ${colorTheme.textShadow} font-medium`}>
                                +{resource.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        <SmartNavigationLink href={`/resources/${resource.slug}`}
                          className="group inline-flex items-center justify-center w-full px-4 py-3 bg-white/90 backdrop-blur-sm hover:bg-white text-gray-900 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                         title={resource.title}>
                          <span>Read More</span>
                          <svg className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </SmartNavigationLink>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingMore ? strings.loading.general : 'Load More Resources'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </MobileAwareContainer>
      </DesktopContainer>
    </div>
  );
}

export default function ResourcesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <ResourcesContent />
    </Suspense>
  );
}