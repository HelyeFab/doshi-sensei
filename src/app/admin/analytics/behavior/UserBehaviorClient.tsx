'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAdmin } from '@/contexts/AdminContext';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

interface BehaviorAnalytics {
  pageViews: Record<string, number>;
  discoveries: Record<string, number>;
  errors: Record<string, number>;
  regions: Record<string, number>;
  devices: Record<string, number>;
  sessions: {
    starts: number;
    ends: number;
  };
}

export default function UserBehaviorClient() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [behaviorData, setBehaviorData] = useState<BehaviorAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!adminLoading && isAdmin) {
      fetchBehaviorAnalytics();
    }
  }, [selectedDate, adminLoading, isAdmin]);

  const fetchBehaviorAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const analyticsRef = doc(db, 'site-analytics', selectedDate, 'daily', 'aggregated');
      const snapshot = await getDoc(analyticsRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        
        // Process behavior data
        const behaviorAnalytics: BehaviorAnalytics = {
          pageViews: {},
          discoveries: {},
          errors: {},
          regions: {},
          devices: {},
          sessions: {
            starts: data.behavior?.['sessions.starts'] || 0,
            ends: data.behavior?.['sessions.ends'] || 0
          }
        };

        // Extract behavior data
        Object.entries(data.behavior || {}).forEach(([key, value]) => {
          if (key.startsWith('pageViews.')) {
            const page = key.replace('pageViews.', '');
            behaviorAnalytics.pageViews[page] = value as number;
          } else if (key.startsWith('discoveries.')) {
            const feature = key.replace('discoveries.', '');
            behaviorAnalytics.discoveries[feature] = value as number;
          } else if (key.startsWith('errors.')) {
            const errorType = key.replace('errors.', '');
            behaviorAnalytics.errors[errorType] = value as number;
          } else if (key.startsWith('regions.')) {
            const region = key.replace('regions.', '');
            behaviorAnalytics.regions[region] = value as number;
          } else if (key.startsWith('devices.')) {
            const device = key.replace('devices.', '');
            behaviorAnalytics.devices[device] = value as number;
          }
        });

        setBehaviorData(behaviorAnalytics);
      } else {
        setBehaviorData(null);
      }
    } catch (err) {
      console.error('Error fetching behavior analytics:', err);
      setError('Failed to load behavior analytics');
    } finally {
      setLoading(false);
    }
  };

  if (adminLoading) return <div>Loading admin status...</div>;
  if (!isAdmin) return <div>Access denied</div>;

  // Calculate metrics
  const totalPageViews = behaviorData ? 
    Object.values(behaviorData.pageViews).reduce((sum, val) => sum + val, 0) : 0;
  const totalDiscoveries = behaviorData ? 
    Object.values(behaviorData.discoveries).reduce((sum, val) => sum + val, 0) : 0;
  const totalErrors = behaviorData ? 
    Object.values(behaviorData.errors).reduce((sum, val) => sum + val, 0) : 0;
  const totalUsers = behaviorData ? 
    Object.values(behaviorData.regions).reduce((sum, val) => sum + val, 0) : 0;

  // Device distribution percentages
  const deviceStats = behaviorData ? Object.entries(behaviorData.devices)
    .map(([device, count]) => ({
      device,
      count,
      percentage: totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count) : [];

  return (
    <AdminLayout title="User Behavior Analytics">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">User Behavior Analytics</h1>
            <p className="text-muted-foreground">Understand how users navigate and interact with the platform</p>
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
            <div className="animate-pulse text-4xl mb-2">👤</div>
            <p>Loading behavior analytics...</p>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {/* No data state */}
        {!loading && !error && !behaviorData && (
          <div className="text-center py-12 bg-muted/50 rounded-lg">
            <div className="text-4xl mb-2">📅</div>
            <p className="text-muted-foreground">No behavior data available for {selectedDate}</p>
          </div>
        )}

        {/* Behavior data */}
        {!loading && !error && behaviorData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Page Views</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalPageViews}</div>
                  <p className="text-xs text-muted-foreground">Total page visits</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Feature Discoveries</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalDiscoveries}</div>
                  <p className="text-xs text-muted-foreground">New features explored</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{behaviorData.sessions.starts}</div>
                  <p className="text-xs text-muted-foreground">User sessions today</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {totalPageViews > 0 ? ((totalErrors / totalPageViews) * 100).toFixed(1) : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">{totalErrors} total errors</p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Behavior Tabs */}
            <Tabs defaultValue="navigation" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="navigation">Navigation</TabsTrigger>
                <TabsTrigger value="discovery">Discovery</TabsTrigger>
                <TabsTrigger value="technical">Technical</TabsTrigger>
                <TabsTrigger value="errors">Errors</TabsTrigger>
              </TabsList>

              <TabsContent value="navigation" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Pages</CardTitle>
                    <CardDescription>Most visited pages today</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(behaviorData.pageViews).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(behaviorData.pageViews)
                          .sort(([,a], [,b]) => b - a)
                          .slice(0, 10)
                          .map(([page, views]) => {
                            const percentage = totalPageViews > 0 ? 
                              Math.round((views / totalPageViews) * 100) : 0;
                            return (
                              <div key={page} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="font-mono text-xs">{page}</span>
                                  <span className="font-medium">{views} views</span>
                                </div>
                                <Progress value={percentage} className="h-2" />
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No page view data</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="discovery" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Feature Discovery</CardTitle>
                    <CardDescription>Features users are discovering for the first time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(behaviorData.discoveries).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(behaviorData.discoveries)
                          .sort(([,a], [,b]) => b - a)
                          .map(([feature, count]) => (
                            <div key={feature} className="flex items-center justify-between">
                              <span className="text-sm capitalize">{feature.replace(/_/g, ' ')}</span>
                              <span className="font-medium">{count} discoveries</span>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No discovery data</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="technical" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Device Distribution</CardTitle>
                      <CardDescription>User devices breakdown</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {deviceStats.length > 0 ? (
                        <div className="space-y-3">
                          {deviceStats.map(({ device, count, percentage }) => (
                            <div key={device} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="capitalize">{device}</span>
                                <span className="font-medium">{percentage}%</span>
                              </div>
                              <Progress value={percentage} className="h-2" />
                              <p className="text-xs text-muted-foreground">{count} users</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No device data</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Geographic Distribution</CardTitle>
                      <CardDescription>Users by region</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {Object.keys(behaviorData.regions).length > 0 ? (
                        <div className="space-y-3">
                          {Object.entries(behaviorData.regions)
                            .sort(([,a], [,b]) => b - a)
                            .map(([region, count]) => {
                              const percentage = totalUsers > 0 ? 
                                Math.round((count / totalUsers) * 100) : 0;
                              return (
                                <div key={region} className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-2xl">
                                      {region === 'americas' ? '🌎' :
                                       region === 'europe' ? '🇪🇺' :
                                       region === 'asia' ? '🌏' :
                                       region === 'africa' ? '🌍' :
                                       region === 'oceania' ? '🏝️' : '🌐'}
                                    </span>
                                    <span className="text-sm capitalize">{region}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-medium">{count}</span>
                                    <span className="text-xs text-muted-foreground ml-1">({percentage}%)</span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No geographic data</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="errors" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Error Tracking</CardTitle>
                    <CardDescription>System errors and issues encountered</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(behaviorData.errors).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(behaviorData.errors)
                          .sort(([,a], [,b]) => b - a)
                          .map(([errorType, count]) => (
                            <div key={errorType} className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg">
                              <span className="text-sm font-medium text-destructive">
                                {errorType.replace(/_/g, ' ')}
                              </span>
                              <span className="font-medium">{count} occurrences</span>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-2">✅</div>
                        <p className="text-muted-foreground">No errors reported today!</p>
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