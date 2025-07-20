'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAdmin } from '@/contexts/AdminContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Line, Bar, Pie } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

interface AnalyticsData {
  summary: {
    totalEvents: number;
    guestEvents: number;
    freeUserEvents: number;
    premiumUserEvents: number;
  };
  content: Record<string, number>;
  features: Record<string, number>;
  behavior: Record<string, number>;
  conversions: Record<string, number>;
}

interface RegistrationStats {
  today: number;
  thisWeek: number;
  thisMonth: number;
}

export default function AnalyticsOverview() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [registrationStats, setRegistrationStats] = useState<RegistrationStats>({ today: 0, thisWeek: 0, thisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!adminLoading && isAdmin) {
      fetchAnalyticsData();
    }
  }, [selectedDate, adminLoading, isAdmin]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch today's data
      const analyticsRef = doc(db, 'site-analytics', selectedDate, 'daily', 'aggregated');
      const snapshot = await getDoc(analyticsRef);

      if (snapshot.exists()) {
        const todayData = snapshot.data() as AnalyticsData;
        setAnalyticsData(todayData);

        // Calculate registration stats for different periods
        const today = new Date(selectedDate);
        const registrations: RegistrationStats = {
          today: todayData.conversions?.['registrations.total'] || 0,
          thisWeek: 0,
          thisMonth: 0
        };

        // Fetch last 7 days for weekly stats
        const weekPromises = [];
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          const dayRef = doc(db, 'site-analytics', dateStr, 'daily', 'aggregated');
          weekPromises.push(getDoc(dayRef));
        }

        // Fetch last 30 days for monthly stats
        const monthPromises = [];
        for (let i = 0; i < 30; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          const dayRef = doc(db, 'site-analytics', dateStr, 'daily', 'aggregated');
          monthPromises.push(getDoc(dayRef));
        }

        // Calculate weekly registrations
        const weekResults = await Promise.all(weekPromises);
        registrations.thisWeek = weekResults.reduce((sum, doc) => {
          if (doc.exists()) {
            return sum + (doc.data().conversions?.['registrations.total'] || 0);
          }
          return sum;
        }, 0);

        // Calculate monthly registrations
        const monthResults = await Promise.all(monthPromises);
        registrations.thisMonth = monthResults.reduce((sum, doc) => {
          if (doc.exists()) {
            return sum + (doc.data().conversions?.['registrations.total'] || 0);
          }
          return sum;
        }, 0);

        setRegistrationStats(registrations);
      } else {
        setAnalyticsData(null);
        setRegistrationStats({ today: 0, thisWeek: 0, thisMonth: 0 });
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (adminLoading) return <div>Loading admin status...</div>;
  if (!isAdmin) return <div>Access denied</div>;

  // Process data for charts
  const userDistribution = analyticsData ? [
    { name: 'Guest', value: analyticsData.summary.guestEvents, color: '#94a3b8' },
    { name: 'Free', value: analyticsData.summary.freeUserEvents, color: '#60a5fa' },
    { name: 'Premium', value: analyticsData.summary.premiumUserEvents, color: '#a78bfa' },
  ].filter(item => item.value > 0) : [];

  const topContent = analyticsData?.content ?
    Object.entries(analyticsData.content)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([key, value]) => ({ name: key.replace(/\./g, ' '), value })) : [];

  const topFeatures = analyticsData?.features ?
    Object.entries(analyticsData.features)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([key, value]) => ({ name: key.replace(/\./g, ' '), value })) : [];

  return (
    <AdminLayout title="Analytics Overview" hideHeader={true}>
      {/* Virtual Companion Section - 1/6th of screen height */}
      <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />

        {/* Gradient to White Fade */}
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Back Button */}
      <div className="px-4 sm:px-6 pt-4 mb-6">
        <button
          onClick={() => router.push('/admin')}
          className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors inline-flex items-center justify-center"
          aria-label="Back to admin dashboard"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className="space-y-6">
        {/* Header with date selector */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Track user behavior and platform usage</p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="date-select" className="text-sm font-medium">Date:</label>
            <input
              id="date-select"
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
            <div className="animate-pulse text-4xl mb-2">📊</div>
            <p>Loading analytics data...</p>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {/* No data state */}
        {!loading && !error && !analyticsData && (
          <div className="text-center py-12 bg-muted/50 rounded-lg">
            <div className="text-4xl mb-2">📅</div>
            <p className="text-muted-foreground">No analytics data available for {selectedDate}</p>
            <p className="text-sm text-muted-foreground mt-2">Data is collected as users interact with the platform</p>
          </div>
        )}

        {/* Analytics data */}
        {!loading && !error && analyticsData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsData.summary.totalEvents || 0}</div>
                  <p className="text-xs text-muted-foreground">All tracked activities</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(analyticsData.summary.freeUserEvents > 0 ? 1 : 0) +
                     (analyticsData.summary.premiumUserEvents > 0 ? 1 : 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Logged in today</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">New Registrations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analyticsData.conversions?.['registrations.total'] || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Signed up today</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Guest Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsData.summary.guestEvents || 0}</div>
                  <p className="text-xs text-muted-foreground">Anonymous visitors</p>
                </CardContent>
              </Card>
            </div>

            {/* Navigation Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="behavior">Behavior</TabsTrigger>
                <TabsTrigger value="conversions">Conversions</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {/* Registration Growth Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle>User Registration Growth</CardTitle>
                    <CardDescription>New user signups across different time periods</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-3xl font-bold">{registrationStats.today}</div>
                        <p className="text-sm text-muted-foreground">Today</p>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-3xl font-bold">{registrationStats.thisWeek}</div>
                        <p className="text-sm text-muted-foreground">Last 7 Days</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ~{Math.round(registrationStats.thisWeek / 7)} per day
                        </p>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-3xl font-bold">{registrationStats.thisMonth}</div>
                        <p className="text-sm text-muted-foreground">Last 30 Days</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ~{Math.round(registrationStats.thisMonth / 30)} per day
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* User Distribution */}
                  <Card>
                    <CardHeader>
                      <CardTitle>User Distribution</CardTitle>
                      <CardDescription>Events by user type</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {userDistribution.length > 0 ? (
                        <div className="space-y-2">
                          {userDistribution.map((item) => (
                            <div key={item.name} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: item.color }}
                                />
                                <span className="text-sm">{item.name}</span>
                              </div>
                              <span className="font-medium">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No user data</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Quick Links */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Analytics Sections</CardTitle>
                      <CardDescription>Dive deeper into specific metrics</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Link href="/admin/analytics/content" className="block p-3 rounded-lg hover:bg-muted transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">📖</span>
                              <span className="font-medium">Content Analytics</span>
                            </div>
                            <span className="text-muted-foreground">→</span>
                          </div>
                        </Link>
                        <Link href="/admin/analytics/features" className="block p-3 rounded-lg hover:bg-muted transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">🎮</span>
                              <span className="font-medium">Feature Usage</span>
                            </div>
                            <span className="text-muted-foreground">→</span>
                          </div>
                        </Link>
                        <Link href="/admin/analytics/behavior" className="block p-3 rounded-lg hover:bg-muted transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">👤</span>
                              <span className="font-medium">User Behavior</span>
                            </div>
                            <span className="text-muted-foreground">→</span>
                          </div>
                        </Link>
                        <Link href="/admin/analytics/conversions" className="block p-3 rounded-lg hover:bg-muted transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">💎</span>
                              <span className="font-medium">Conversions</span>
                            </div>
                            <span className="text-muted-foreground">→</span>
                          </div>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="content">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Content</CardTitle>
                    <CardDescription>Most engaged content today</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {topContent.length > 0 ? (
                      <div className="space-y-3">
                        {topContent.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="text-sm capitalize">{item.name}</span>
                            <span className="font-medium">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No content data</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="features">
                <Card>
                  <CardHeader>
                    <CardTitle>Feature Usage</CardTitle>
                    <CardDescription>Most used features today</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {topFeatures.length > 0 ? (
                      <div className="space-y-3">
                        {topFeatures.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="text-sm capitalize">{item.name}</span>
                            <span className="font-medium">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No feature data</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="behavior">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Page Views</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-center py-4">View detailed behavior analytics</p>
                      <Link href="/admin/analytics/behavior" className="block mt-4">
                        <button className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                          View Details
                        </button>
                      </Link>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Device Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-center py-4">See device and browser stats</p>
                      <Link href="/admin/analytics/behavior" className="block mt-4">
                        <button className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                          View Details
                        </button>
                      </Link>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="conversions">
                <Card>
                  <CardHeader>
                    <CardTitle>Conversion Funnel</CardTitle>
                    <CardDescription>User journey from guest to premium</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-center py-4">View detailed conversion analytics</p>
                    <Link href="/admin/analytics/conversions" className="block mt-4">
                      <button className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                        View Conversion Details
                      </button>
                    </Link>
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
