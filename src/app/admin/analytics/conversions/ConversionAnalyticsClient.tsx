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
import { ArrowRight } from 'lucide-react';

interface ConversionAnalytics {
  limitsReached: Record<string, number>;
  upgradeModals: {
    shown: number;
    clicked: number;
    triggers: Record<string, number>;
  };
  registrations: {
    total: number;
    sources: Record<string, number>;
  };
  subscriptions: {
    started: number;
  };
}

export default function ConversionAnalyticsClient() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [conversionData, setConversionData] = useState<ConversionAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!adminLoading && isAdmin) {
      fetchConversionAnalytics();
    }
  }, [selectedDate, adminLoading, isAdmin]);

  const fetchConversionAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const analyticsRef = doc(db, 'site-analytics', selectedDate, 'daily', 'aggregated');
      const snapshot = await getDoc(analyticsRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        
        // Process conversion data
        const conversionAnalytics: ConversionAnalytics = {
          limitsReached: {},
          upgradeModals: {
            shown: data.conversions?.['upgradeModals.shown'] || 0,
            clicked: data.conversions?.['upgradeModals.clicked'] || 0,
            triggers: {}
          },
          registrations: {
            total: data.conversions?.['registrations.total'] || 0,
            sources: {}
          },
          subscriptions: {
            started: data.conversions?.['subscriptions.started'] || 0
          }
        };

        // Extract conversion data
        Object.entries(data.conversions || {}).forEach(([key, value]) => {
          if (key.startsWith('limitsReached.')) {
            const feature = key.replace('limitsReached.', '');
            conversionAnalytics.limitsReached[feature] = value as number;
          } else if (key.startsWith('upgradeModals.trigger.')) {
            const trigger = key.replace('upgradeModals.trigger.', '');
            conversionAnalytics.upgradeModals.triggers[trigger] = value as number;
          } else if (key.startsWith('registrations.source.')) {
            const source = key.replace('registrations.source.', '');
            conversionAnalytics.registrations.sources[source] = value as number;
          }
        });

        setConversionData(conversionAnalytics);
      } else {
        setConversionData(null);
      }
    } catch (err) {
      console.error('Error fetching conversion analytics:', err);
      setError('Failed to load conversion analytics');
    } finally {
      setLoading(false);
    }
  };

  if (adminLoading) return <div>Loading admin status...</div>;
  if (!isAdmin) return <div>Access denied</div>;

  // Calculate metrics
  const totalLimitsReached = conversionData ? 
    Object.values(conversionData.limitsReached).reduce((sum, val) => sum + val, 0) : 0;
  
  const modalConversionRate = conversionData && conversionData.upgradeModals.shown > 0 ?
    Math.round((conversionData.upgradeModals.clicked / conversionData.upgradeModals.shown) * 100) : 0;

  const limitToModalRate = totalLimitsReached > 0 && conversionData ?
    Math.round((conversionData.upgradeModals.shown / totalLimitsReached) * 100) : 0;

  const modalToSubscriptionRate = conversionData && conversionData.upgradeModals.clicked > 0 ?
    Math.round((conversionData.subscriptions.started / conversionData.upgradeModals.clicked) * 100) : 0;

  return (
    <AdminLayout title="Conversion Analytics">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Conversion Analytics</h1>
            <p className="text-muted-foreground">Track user journey from free to premium</p>
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
            <div className="animate-pulse text-4xl mb-2">💎</div>
            <p>Loading conversion analytics...</p>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {/* No data state */}
        {!loading && !error && !conversionData && (
          <div className="text-center py-12 bg-muted/50 rounded-lg">
            <div className="text-4xl mb-2">📅</div>
            <p className="text-muted-foreground">No conversion data available for {selectedDate}</p>
          </div>
        )}

        {/* Conversion data */}
        {!loading && !error && conversionData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Feature Limits Hit</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalLimitsReached}</div>
                  <p className="text-xs text-muted-foreground">Users reached limits</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Upgrade Modals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{conversionData.upgradeModals.shown}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Progress value={modalConversionRate} className="flex-1" />
                    <span className="text-xs text-muted-foreground">{modalConversionRate}% clicked</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">New Registrations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{conversionData.registrations.total}</div>
                  <p className="text-xs text-muted-foreground">Guest to free conversions</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">New Subscriptions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{conversionData.subscriptions.started}</div>
                  <p className="text-xs text-muted-foreground">Free to premium upgrades</p>
                </CardContent>
              </Card>
            </div>

            {/* Conversion Funnel */}
            <Card>
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
                <CardDescription>User journey from limit reached to subscription</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Funnel stages */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">{totalLimitsReached}</div>
                        <p className="text-sm text-muted-foreground">Limits Reached</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-5 h-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{limitToModalRate}%</span>
                    </div>

                    <div className="flex-1">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">{conversionData.upgradeModals.shown}</div>
                        <p className="text-sm text-muted-foreground">Modals Shown</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-5 h-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{modalConversionRate}%</span>
                    </div>

                    <div className="flex-1">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">{conversionData.upgradeModals.clicked}</div>
                        <p className="text-sm text-muted-foreground">Modals Clicked</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-5 h-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{modalToSubscriptionRate}%</span>
                    </div>

                    <div className="flex-1">
                      <div className="text-center p-4 bg-primary/10 rounded-lg border-2 border-primary">
                        <div className="text-2xl font-bold text-primary">
                          {conversionData.subscriptions.started}
                        </div>
                        <p className="text-sm text-muted-foreground">Subscriptions</p>
                      </div>
                    </div>
                  </div>

                  {/* Overall conversion rate */}
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Overall Conversion Rate</p>
                    <div className="text-3xl font-bold">
                      {totalLimitsReached > 0 ? 
                        ((conversionData.subscriptions.started / totalLimitsReached) * 100).toFixed(1) : 0}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      From limit reached to subscription
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Conversion Tabs */}
            <Tabs defaultValue="limits" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="limits">Feature Limits</TabsTrigger>
                <TabsTrigger value="triggers">Modal Triggers</TabsTrigger>
                <TabsTrigger value="registrations">Registrations</TabsTrigger>
              </TabsList>

              <TabsContent value="limits" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Feature Limits Reached</CardTitle>
                    <CardDescription>Which features drive users to upgrade</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(conversionData.limitsReached).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(conversionData.limitsReached)
                          .sort(([,a], [,b]) => b - a)
                          .map(([feature, count]) => {
                            const percentage = totalLimitsReached > 0 ? 
                              Math.round((count / totalLimitsReached) * 100) : 0;
                            return (
                              <div key={feature} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="capitalize">{feature.replace(/_/g, ' ')}</span>
                                  <span className="font-medium">{count} users</span>
                                </div>
                                <Progress value={percentage} className="h-2" />
                                <p className="text-xs text-muted-foreground">{percentage}% of all limits</p>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No limit data</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="triggers" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Modal Trigger Analysis</CardTitle>
                    <CardDescription>What prompts users to see upgrade options</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(conversionData.upgradeModals.triggers).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(conversionData.upgradeModals.triggers)
                          .sort(([,a], [,b]) => b - a)
                          .map(([trigger, count]) => (
                            <div key={trigger} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                              <span className="text-sm capitalize">{trigger.replace(/_/g, ' ')}</span>
                              <div className="text-right">
                                <span className="font-medium">{count}</span>
                                <span className="text-xs text-muted-foreground ml-1">times</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No trigger data</p>
                    )}
                    
                    {conversionData.upgradeModals.shown > 0 && (
                      <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <p className="text-sm">
                          <strong>Click-through rate:</strong>{' '}
                          <span className="font-medium">{modalConversionRate}%</span> of users who saw the upgrade modal clicked to learn more.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="registrations" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Registration Sources</CardTitle>
                    <CardDescription>Where new users are coming from</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(conversionData.registrations.sources).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(conversionData.registrations.sources)
                          .sort(([,a], [,b]) => b - a)
                          .map(([source, count]) => {
                            const percentage = conversionData.registrations.total > 0 ? 
                              Math.round((count / conversionData.registrations.total) * 100) : 0;
                            return (
                              <div key={source} className="flex items-center justify-between">
                                <span className="text-sm capitalize">{source.replace(/_/g, ' ')}</span>
                                <div className="text-right">
                                  <span className="font-medium">{count}</span>
                                  <span className="text-xs text-muted-foreground ml-1">({percentage}%)</span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No registration data</p>
                    )}
                    
                    {conversionData.registrations.total > 0 && (
                      <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm">
                          <strong>Total new users:</strong>{' '}
                          <span className="font-medium">{conversionData.registrations.total}</span> guests converted to registered users today.
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