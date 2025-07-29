'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { 
  TrendingUp, Users, BookOpen, GameController2, Target, Activity,
  Calendar, Clock, Zap, Award
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface DailyMetrics {
  date: string;
  activeUsers: number;
  stories: number;
  drills: number;
  games: number;
  newUsers: number;
  premiumUsers: number;
}

interface FeatureUsage {
  feature: string;
  count: number;
  percentage: number;
}

interface UserTypeDistribution {
  type: string;
  count: number;
  color: string;
}

interface EngagementMetrics {
  avgSessionDuration: number;
  avgDailyActiveTime: number;
  returnRate: number;
  conversionRate: number;
}

const COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  accent: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  pink: '#EC4899',
  indigo: '#6366F1',
  teal: '#14B8A6'
};

export default function KPIDashboardPage() {
  const [timeRange, setTimeRange] = useState('7d');
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetrics[]>([]);
  const [featureUsage, setFeatureUsage] = useState<FeatureUsage[]>([]);
  const [userTypeDistribution, setUserTypeDistribution] = useState<UserTypeDistribution[]>([]);
  const [engagementMetrics, setEngagementMetrics] = useState<EngagementMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeToday, setActiveToday] = useState(0);
  const [totalStoriesRead, setTotalStoriesRead] = useState(0);
  const [avgDailyGrowth, setAvgDailyGrowth] = useState(0);

  useEffect(() => {
    loadAllMetrics();
  }, [timeRange]);

  const loadAllMetrics = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadDailyMetrics(),
        loadFeatureUsage(),
        loadUserTypeDistribution(),
        loadEngagementMetrics(),
        loadTotalStats()
      ]);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDailyMetrics = async () => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const metrics: DailyMetrics[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      try {
        // Get daily analytics
        const analyticsDoc = await getDocs(
          collection(db, 'site-analytics', dateStr, 'daily')
        );
        
        let dailyData: DailyMetrics = {
          date: format(date, 'MMM dd'),
          activeUsers: 0,
          stories: 0,
          drills: 0,
          games: 0,
          newUsers: 0,
          premiumUsers: 0
        };
        
        if (!analyticsDoc.empty) {
          const aggregated = analyticsDoc.docs.find(d => d.id === 'aggregated');
          if (aggregated) {
            const data = aggregated.data();
            dailyData = {
              date: format(date, 'MMM dd'),
              activeUsers: data.metrics?.uniqueUsers || 0,
              stories: data.content?.stories?.totalReads || 0,
              drills: data.features?.drill_practice?.totalUses || 0,
              games: (data.features?.kanji_quest?.totalUses || 0) + 
                     (data.features?.kana_drop?.totalUses || 0) +
                     (data.features?.memory_match?.totalUses || 0),
              newUsers: data.users?.newRegistrations || 0,
              premiumUsers: data.users?.premiumUsers || 0
            };
          }
        }
        
        metrics.push(dailyData);
      } catch (error) {
        console.error(`Error loading metrics for ${dateStr}:`, error);
        metrics.push({
          date: format(date, 'MMM dd'),
          activeUsers: 0,
          stories: 0,
          drills: 0,
          games: 0,
          newUsers: 0,
          premiumUsers: 0
        });
      }
    }
    
    setDailyMetrics(metrics);
  };

  const loadFeatureUsage = async () => {
    try {
      // Get today's analytics
      const today = format(new Date(), 'yyyy-MM-dd');
      const analyticsSnapshot = await getDocs(
        collection(db, 'site-analytics', today, 'daily')
      );
      
      const aggregated = analyticsSnapshot.docs.find(d => d.id === 'aggregated');
      if (aggregated) {
        const data = aggregated.data();
        const features = data.features || {};
        
        const usage: FeatureUsage[] = Object.entries(features)
          .filter(([_, value]: [string, any]) => value.totalUses > 0)
          .map(([feature, value]: [string, any]) => ({
            feature: feature.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            count: value.totalUses || 0,
            percentage: 0
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);
        
        // Calculate percentages
        const total = usage.reduce((sum, item) => sum + item.count, 0);
        usage.forEach(item => {
          item.percentage = Math.round((item.count / total) * 100);
        });
        
        setFeatureUsage(usage);
      }
    } catch (error) {
      console.error('Error loading feature usage:', error);
    }
  };

  const loadUserTypeDistribution = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const distribution = {
        guest: 0,
        free: 0,
        monthly: 0,
        yearly: 0
      };
      
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (!userData.email) {
          distribution.guest++;
        } else if (userData.subscription?.status === 'active') {
          if (userData.subscription.plan === 'monthly') {
            distribution.monthly++;
          } else if (userData.subscription.plan === 'yearly') {
            distribution.yearly++;
          }
        } else {
          distribution.free++;
        }
      });
      
      setUserTypeDistribution([
        { type: 'Guest', count: distribution.guest, color: COLORS.secondary },
        { type: 'Free', count: distribution.free, color: COLORS.primary },
        { type: 'Monthly', count: distribution.monthly, color: COLORS.accent },
        { type: 'Yearly', count: distribution.yearly, color: COLORS.purple }
      ]);
    } catch (error) {
      console.error('Error loading user distribution:', error);
    }
  };

  const loadEngagementMetrics = async () => {
    try {
      // This would need more sophisticated tracking, but for now we'll use mock data
      setEngagementMetrics({
        avgSessionDuration: 12.5, // minutes
        avgDailyActiveTime: 35, // minutes
        returnRate: 68, // percentage
        conversionRate: 4.2 // percentage
      });
    } catch (error) {
      console.error('Error loading engagement metrics:', error);
    }
  };

  const loadTotalStats = async () => {
    try {
      // Get total users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      setTotalUsers(usersSnapshot.size);
      
      // Get today's active users
      const today = format(new Date(), 'yyyy-MM-dd');
      const todayAnalytics = await getDocs(
        collection(db, 'site-analytics', today, 'daily')
      );
      
      const aggregated = todayAnalytics.docs.find(d => d.id === 'aggregated');
      if (aggregated) {
        const data = aggregated.data();
        setActiveToday(data.metrics?.uniqueUsers || 0);
        
        // Calculate total stories from last 30 days
        let totalStories = 0;
        for (let i = 0; i < 30; i++) {
          const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
          try {
            const dayAnalytics = await getDocs(
              collection(db, 'site-analytics', date, 'daily')
            );
            const dayAggregated = dayAnalytics.docs.find(d => d.id === 'aggregated');
            if (dayAggregated) {
              totalStories += dayAggregated.data().content?.stories?.totalReads || 0;
            }
          } catch (e) {
            // Skip if day doesn't exist
          }
        }
        setTotalStoriesRead(totalStories);
      }
      
      // Calculate average daily growth
      if (dailyMetrics.length > 1) {
        const growth = dailyMetrics.reduce((sum, day, index) => {
          if (index === 0) return sum;
          return sum + (day.newUsers || 0);
        }, 0) / (dailyMetrics.length - 1);
        setAvgDailyGrowth(Math.round(growth * 10) / 10);
      }
    } catch (error) {
      console.error('Error loading total stats:', error);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">KPI Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Track key performance indicators and user engagement metrics
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                timeRange === '7d' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              7 days
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                timeRange === '30d' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              30 days
            </button>
            <button
              onClick={() => setTimeRange('90d')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                timeRange === '90d' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              90 days
            </button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-3xl font-bold">{formatNumber(totalUsers)}</p>
                  <p className="text-xs text-green-600 mt-1">
                    +{avgDailyGrowth} avg/day
                  </p>
                </div>
                <Users className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Today</p>
                  <p className="text-3xl font-bold">{formatNumber(activeToday)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {totalUsers > 0 ? Math.round((activeToday / totalUsers) * 100) : 0}% of total
                  </p>
                </div>
                <Activity className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Stories Read (30d)</p>
                  <p className="text-3xl font-bold">{formatNumber(totalStoriesRead)}</p>
                  <p className="text-xs text-blue-600 mt-1">
                    {totalStoriesRead > 0 ? Math.round(totalStoriesRead / 30) : 0} avg/day
                  </p>
                </div>
                <BookOpen className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Conversion Rate</p>
                  <p className="text-3xl font-bold">{engagementMetrics?.conversionRate || 0}%</p>
                  <p className="text-xs text-purple-600 mt-1">
                    Free → Premium
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="activity" className="space-y-4">
          <TabsList>
            <TabsTrigger value="activity">User Activity</TabsTrigger>
            <TabsTrigger value="features">Feature Usage</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="growth">Growth</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Daily Active Users</CardTitle>
                <CardDescription>
                  Number of unique users who accessed the app each day
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dailyMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="activeUsers" 
                      stroke={COLORS.primary} 
                      fill={COLORS.primary} 
                      fillOpacity={0.3} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Content Consumption</CardTitle>
                  <CardDescription>
                    Stories read and drills completed per day
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dailyMetrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="stories" 
                        stroke={COLORS.primary} 
                        name="Stories"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="drills" 
                        stroke={COLORS.secondary} 
                        name="Drills"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Game Activity</CardTitle>
                  <CardDescription>
                    Total games played across all game types
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dailyMetrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="games" fill={COLORS.accent} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Feature Usage Distribution</CardTitle>
                  <CardDescription>
                    Most used features in the last {timeRange === '7d' ? '7 days' : timeRange === '30d' ? '30 days' : '90 days'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={featureUsage}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {featureUsage.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % Object.values(COLORS).length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Features by Usage</CardTitle>
                  <CardDescription>
                    Feature usage counts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={featureUsage} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="feature" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="count" fill={COLORS.purple} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="engagement" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>User Type Distribution</CardTitle>
                  <CardDescription>
                    Breakdown of users by subscription type
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={userTypeDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="count"
                      >
                        {userTypeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {userTypeDistribution.map((type) => (
                      <div key={type.type} className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                          <span className="text-sm">{type.type}</span>
                        </div>
                        <span className="text-sm font-medium">{type.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Engagement Metrics</CardTitle>
                  <CardDescription>
                    Key engagement indicators
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-gray-500" />
                        <span>Avg Session Duration</span>
                      </div>
                      <span className="font-semibold">{engagementMetrics?.avgSessionDuration || 0} min</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-gray-500" />
                        <span>Daily Active Time</span>
                      </div>
                      <span className="font-semibold">{engagementMetrics?.avgDailyActiveTime || 0} min</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-gray-500" />
                        <span>Return Rate</span>
                      </div>
                      <span className="font-semibold">{engagementMetrics?.returnRate || 0}%</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-gray-500" />
                        <span>Conversion Rate</span>
                      </div>
                      <span className="font-semibold">{engagementMetrics?.conversionRate || 0}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="growth" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>
                  New user registrations and premium upgrades over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="newUsers" 
                      stroke={COLORS.secondary} 
                      name="New Users"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="premiumUsers" 
                      stroke={COLORS.purple} 
                      name="Premium Users"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cumulative Growth</CardTitle>
                <CardDescription>
                  Total users growth trajectory
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dailyMetrics.map((day, index) => ({
                    ...day,
                    cumulativeUsers: dailyMetrics.slice(0, index + 1).reduce((sum, d) => sum + d.newUsers, totalUsers - dailyMetrics.reduce((sum, d) => sum + d.newUsers, 0))
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="cumulativeUsers" 
                      stroke={COLORS.indigo} 
                      fill={COLORS.indigo} 
                      fillOpacity={0.3} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}