'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
// Using emoji icons to match the app's aesthetic
import { ArticleStats } from '@/types/news';
import { useAuth } from '@/contexts/AuthContext';

interface ArticleMonitoringDashboardProps {
  className?: string;
}

export function ArticleMonitoringDashboard({ className }: ArticleMonitoringDashboardProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState<ArticleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  const fetchStats = async (retryCount = 0) => {
    if (!user) return;
    
    try {
      if (retryCount === 0) {
        setLoading(true);
        setError(null);
      }
      
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/articles/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // If it's a 500 error and we haven't retried yet, try again
        if (response.status === 500 && retryCount < 2) {
          console.log(`Retrying stats fetch (attempt ${retryCount + 2})...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchStats(retryCount + 1);
        }
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setStats(data.data);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch stats');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!user) return;
    
    try {
      setIsRefreshing(true);
      const token = await user.getIdToken();
      
      const response = await fetch('/api/admin/articles/stats', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'refresh' })
      });

      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      } else {
        setError(data.error || 'Refresh failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCleanup = async () => {
    if (!user) return;
    
    try {
      setIsCleaningUp(true);
      const token = await user.getIdToken();
      
      const response = await fetch('/api/admin/articles/stats', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'cleanup' })
      });

      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      } else {
        setError(data.error || 'Cleanup failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cleanup failed');
    } finally {
      setIsCleaningUp(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            Article Monitoring Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <span className="text-xl animate-spin">🔄</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-xl text-red-500">⚠️</span>
            Error Loading Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
          <Button onClick={() => fetchStats()} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const jlptDistribution = Object.entries(stats.articlesByDifficulty).map(([level, count]) => ({
    level,
    count,
    percentage: stats.totalArticles > 0 ? (count / stats.totalArticles) * 100 : 0
  }));

  const sourceDistribution = Object.entries(stats.articlesBySource).map(([source, count]) => ({
    source,
    count,
    percentage: stats.totalArticles > 0 ? (count / stats.totalArticles) * 100 : 0
  }));

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            Article Monitoring Dashboard
          </CardTitle>
          <CardDescription>
            Monitor article scraping, distribution, and management
          </CardDescription>
          <div className="flex gap-2">
            <Button 
              onClick={handleRefresh} 
              disabled={isRefreshing}
              size="sm"
              variant="outline"
            >
              {isRefreshing ? (
                <span className="text-sm animate-spin mr-2">🔄</span>
              ) : (
                <span className="text-sm mr-2">🔄</span>
              )}
              Refresh Articles
            </Button>
            <Button 
              onClick={handleCleanup} 
              disabled={isCleaningUp}
              size="sm"
              variant="outline"
            >
              {isCleaningUp ? (
                <span className="text-sm animate-spin mr-2">🔄</span>
              ) : (
                <span className="text-sm mr-2">🗄️</span>
              )}
              Cleanup
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="jlpt">JLPT</TabsTrigger>
              <TabsTrigger value="sources">Sources</TabsTrigger>
              <TabsTrigger value="maintenance">Maint.</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Articles</p>
                        <p className="text-2xl font-bold">{stats.totalArticles}</p>
                      </div>
                      <span className="text-2xl">📚</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Bookmarks</p>
                        <p className="text-2xl font-bold">{stats.totalBookmarks}</p>
                      </div>
                      <span className="text-2xl">📈</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Reading Time</p>
                        <p className="text-2xl font-bold">{stats.averageReadingTime}m</p>
                      </div>
                      <span className="text-2xl">⏱️</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Expiring Soon</p>
                        <p className="text-2xl font-bold">{stats.expiringSoon}</p>
                      </div>
                      <span className="text-2xl">⚠️</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="jlpt" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">JLPT Level Distribution</h3>
                {jlptDistribution.map(({ level, count, percentage }) => (
                  <div key={level} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{level}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {count} articles ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="sources" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Source Distribution</h3>
                {sourceDistribution.map(({ source, count, percentage }) => (
                  <div key={source} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{source}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {count} articles ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="maintenance" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Maintenance Operations</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Article Cleanup</p>
                      <p className="text-sm text-muted-foreground">
                        Remove expired articles and optimize storage
                      </p>
                    </div>
                    <Button 
                      onClick={handleCleanup} 
                      disabled={isCleaningUp}
                      variant="outline"
                      size="sm"
                    >
                      {isCleaningUp ? (
                        <span className="text-sm animate-spin">🔄</span>
                      ) : (
                        'Run Cleanup'
                      )}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Force Refresh</p>
                      <p className="text-sm text-muted-foreground">
                        Scrape new articles from all sources
                      </p>
                    </div>
                    <Button 
                      onClick={handleRefresh} 
                      disabled={isRefreshing}
                      variant="outline"
                      size="sm"
                    >
                      {isRefreshing ? (
                        <span className="text-sm animate-spin">🔄</span>
                      ) : (
                        'Refresh'
                      )}
                    </Button>
                  </div>

                  {stats.expiringSoon > 0 && (
                    <div className="p-3 border rounded-lg bg-orange-50">
                      <div className="flex items-center gap-2 text-orange-800">
                        <span className="text-sm">⚠️</span>
                        <p className="font-medium">
                          {stats.expiringSoon} articles expire within 7 days
                        </p>
                      </div>
                      <p className="text-sm text-orange-600 mt-1">
                        Articles will be automatically archived if bookmarked or deleted if not
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default ArticleMonitoringDashboard;