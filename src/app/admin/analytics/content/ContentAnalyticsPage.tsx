'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAdmin } from '@/contexts/AdminContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

interface ContentAnalytics {
  articles: {
    viewed: Record<string, number>;
    completed: Record<string, number>;
    totalReadTime: number;
  };
  stories: {
    started: Record<string, number>;
    completed: Record<string, number>;
    totalReadTime: number;
  };
  moodboards: {
    viewed: number;
    totalViewTime: number;
  };
}

export default function ContentAnalyticsPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [contentData, setContentData] = useState<ContentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'day' | 'week' | 'month'>('day');

  useEffect(() => {
    if (!adminLoading && isAdmin) {
      fetchContentAnalytics();
    }
  }, [selectedDate, dateRange, adminLoading, isAdmin]);

  const fetchContentAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // For now, just fetch single day data
      const analyticsRef = doc(db, 'site-analytics', selectedDate, 'daily', 'aggregated');
      const snapshot = await getDoc(analyticsRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        
        // Process content data
        const contentAnalytics: ContentAnalytics = {
          articles: {
            viewed: {},
            completed: {},
            totalReadTime: data.content?.['articles.totalReadTime'] || 0
          },
          stories: {
            started: {},
            completed: {},
            totalReadTime: data.content?.['stories.totalReadTime'] || 0
          },
          moodboards: {
            viewed: data.content?.['moodboards.viewed'] || 0,
            totalViewTime: data.content?.['moodboards.totalViewTime'] || 0
          }
        };

        // Extract article data
        Object.entries(data.content || {}).forEach(([key, value]) => {
          if (key.startsWith('articles.viewed.')) {
            const category = key.replace('articles.viewed.', '');
            contentAnalytics.articles.viewed[category] = value as number;
          } else if (key.startsWith('articles.completed.')) {
            const category = key.replace('articles.completed.', '');
            contentAnalytics.articles.completed[category] = value as number;
          } else if (key.startsWith('stories.started.')) {
            const level = key.replace('stories.started.', '');
            contentAnalytics.stories.started[level] = value as number;
          } else if (key.startsWith('stories.completed.')) {
            const level = key.replace('stories.completed.', '');
            contentAnalytics.stories.completed[level] = value as number;
          }
        });

        setContentData(contentAnalytics);
      } else {
        setContentData(null);
      }
    } catch (err) {
      console.error('Error fetching content analytics:', err);
      setError('Failed to load content analytics');
    } finally {
      setLoading(false);
    }
  };

  if (adminLoading) return <div>Loading admin status...</div>;
  if (!isAdmin) return <div>Access denied</div>;

  // Calculate metrics
  const totalArticleViews = contentData ? 
    Object.values(contentData.articles.viewed).reduce((sum, val) => sum + val, 0) : 0;
  const totalArticleCompletions = contentData ? 
    Object.values(contentData.articles.completed).reduce((sum, val) => sum + val, 0) : 0;
  const articleCompletionRate = totalArticleViews > 0 ? 
    Math.round((totalArticleCompletions / totalArticleViews) * 100) : 0;

  const totalStoryStarts = contentData ? 
    Object.values(contentData.stories.started).reduce((sum, val) => sum + val, 0) : 0;
  const totalStoryCompletions = contentData ? 
    Object.values(contentData.stories.completed).reduce((sum, val) => sum + val, 0) : 0;
  const storyCompletionRate = totalStoryStarts > 0 ? 
    Math.round((totalStoryCompletions / totalStoryStarts) * 100) : 0;

  const avgArticleReadTime = totalArticleCompletions > 0 && contentData ? 
    Math.round(contentData.articles.totalReadTime / totalArticleCompletions) : 0;
  const avgStoryReadTime = totalStoryCompletions > 0 && contentData ? 
    Math.round(contentData.stories.totalReadTime / totalStoryCompletions) : 0;
  const avgMoodboardViewTime = contentData?.moodboards?.viewed && contentData.moodboards.viewed > 0 ? 
    Math.round(contentData.moodboards.totalViewTime / contentData.moodboards.viewed) : 0;

  return (
    <AdminLayout title="Content Analytics">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Content Analytics</h1>
            <p className="text-muted-foreground">Track engagement with articles, stories, and moodboards</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1 border rounded-md bg-background"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        {/* Loading/Error states */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-pulse text-4xl mb-2">📖</div>
            <p>Loading content analytics...</p>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {/* No data state */}
        {!loading && !error && !contentData && (
          <div className="text-center py-12 bg-muted/50 rounded-lg">
            <div className="text-4xl mb-2">📅</div>
            <p className="text-muted-foreground">No content data available for {selectedDate}</p>
          </div>
        )}

        {/* Content data */}
        {!loading && !error && contentData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Article Views</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalArticleViews}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Progress value={articleCompletionRate} className="flex-1" />
                    <span className="text-xs text-muted-foreground">{articleCompletionRate}% completed</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Story Reads</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalStoryStarts}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Progress value={storyCompletionRate} className="flex-1" />
                    <span className="text-xs text-muted-foreground">{storyCompletionRate}% completed</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Moodboard Views</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{contentData.moodboards.viewed}</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Avg. {avgMoodboardViewTime}s per view
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Avg. Read Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Articles:</span>
                      <span className="font-medium">{avgArticleReadTime}s</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Stories:</span>
                      <span className="font-medium">{avgStoryReadTime}s</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Content Tabs */}
            <Tabs defaultValue="articles" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="articles">Articles</TabsTrigger>
                <TabsTrigger value="stories">Stories</TabsTrigger>
                <TabsTrigger value="moodboards">Moodboards</TabsTrigger>
              </TabsList>

              <TabsContent value="articles" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Article Views by Category</CardTitle>
                      <CardDescription>Which categories are most popular</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {Object.keys(contentData.articles.viewed).length > 0 ? (
                        <div className="space-y-3">
                          {Object.entries(contentData.articles.viewed)
                            .sort(([,a], [,b]) => b - a)
                            .map(([category, views]) => (
                              <div key={category} className="flex items-center justify-between">
                                <span className="text-sm capitalize">{category}</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{views}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ({contentData.articles.completed[category] || 0} completed)
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No article views today</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Article Completion Rates</CardTitle>
                      <CardDescription>Which categories have best engagement</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {Object.keys(contentData.articles.viewed).length > 0 ? (
                        <div className="space-y-3">
                          {Object.entries(contentData.articles.viewed)
                            .map(([category, views]) => {
                              const completed = contentData.articles.completed[category] || 0;
                              const rate = views > 0 ? Math.round((completed / views) * 100) : 0;
                              return { category, rate, views };
                            })
                            .sort((a, b) => b.rate - a.rate)
                            .map(({ category, rate, views }) => (
                              <div key={category} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="capitalize">{category}</span>
                                  <span className="font-medium">{rate}%</span>
                                </div>
                                <Progress value={rate} className="h-2" />
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No completion data</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="stories" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Story Starts by Level</CardTitle>
                      <CardDescription>Which difficulty levels are most popular</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {Object.keys(contentData.stories.started).length > 0 ? (
                        <div className="space-y-3">
                          {Object.entries(contentData.stories.started)
                            .sort(([,a], [,b]) => b - a)
                            .map(([level, starts]) => (
                              <div key={level} className="flex items-center justify-between">
                                <span className="text-sm uppercase">{level}</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{starts}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ({contentData.stories.completed[level] || 0} completed)
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No story reads today</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Story Completion Rates</CardTitle>
                      <CardDescription>Engagement by difficulty level</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {Object.keys(contentData.stories.started).length > 0 ? (
                        <div className="space-y-3">
                          {Object.entries(contentData.stories.started)
                            .map(([level, starts]) => {
                              const completed = contentData.stories.completed[level] || 0;
                              const rate = starts > 0 ? Math.round((completed / starts) * 100) : 0;
                              return { level, rate, starts };
                            })
                            .sort((a, b) => b.rate - a.rate)
                            .map(({ level, rate }) => (
                              <div key={level} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="uppercase">{level}</span>
                                  <span className="font-medium">{rate}%</span>
                                </div>
                                <Progress value={rate} className="h-2" />
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No completion data</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="moodboards" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Moodboard Engagement</CardTitle>
                    <CardDescription>Visual content interaction metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-3xl font-bold">{contentData.moodboards.viewed}</div>
                        <p className="text-sm text-muted-foreground">Total Views</p>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-3xl font-bold">{avgMoodboardViewTime}s</div>
                        <p className="text-sm text-muted-foreground">Avg. View Time</p>
                      </div>
                    </div>
                    
                    {contentData.moodboards.viewed > 0 && (
                      <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm">
                          <strong>Engagement Insight:</strong> Users spent a total of{' '}
                          <span className="font-medium">
                            {Math.round(contentData.moodboards.totalViewTime / 60)} minutes
                          </span>{' '}
                          viewing moodboards today.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AdminLayout>
  );
}