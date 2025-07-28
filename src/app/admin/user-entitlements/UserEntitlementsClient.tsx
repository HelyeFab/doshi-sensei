'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Search, 
  RefreshCw, 
  Download, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Users
} from 'lucide-react';
import { db, auth } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface UserEntitlementData {
  uid: string;
  email: string;
  displayName?: string;
  userType: 'guest' | 'free' | 'monthly' | 'yearly';
  subscription?: {
    plan: string;
    status: string;
    renewalDate?: string;
  };
  limits: Record<string, number>;
  usage: Record<string, {
    daily?: number;
    total?: number;
    lastUsed?: string;
  }>;
  features: Array<{
    id: string;
    name: string;
    category: string;
    limitType: 'daily' | 'total' | 'none';
    limit: number;
    used: number;
    remaining: number;
    percentUsed: number;
    status: 'available' | 'warning' | 'exhausted' | 'blocked';
    resetTime?: string;
  }>;
  userStats?: {
    caughtPokemonSet?: { id: string }[];
    learnedKanjiSet?: { id: string }[];
    learnedWordsSet?: { id: string }[];
    storyStats?: {
      lastStoryDate: string;
      storiesReadToday: number;
    };
    lastUpdated?: any;
  };
  dailyActivities?: Array<{
    date: string;
    [key: string]: any;
  }>;
}

export default function UserEntitlementsClient() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserEntitlementData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [recentUsers, setRecentUsers] = useState<UserEntitlementData[]>([]);
  const [activeTab, setActiveTab] = useState('search');

  useEffect(() => {
    loadRecentUsers();
  }, []);


  const loadRecentUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      
      // First, let's try the simplest query possible
      try {
        const snapshot = await getDocs(usersRef);
        
        const users: UserEntitlementData[] = [];
        let skippedCount = 0;
        
        // Get first 10 users manually
        const userDocs = snapshot.docs.slice(0, 10);
        
        for (const doc of userDocs) {
          const userData = doc.data();
          
          // Skip if no email (guest users stored differently)
          if (!userData.email) {
            skippedCount++;
            continue;
          }
          
          // Determine user type from basic data (no API call needed)
          let userType: 'guest' | 'free' | 'monthly' | 'yearly' = 'free';
          if (userData?.subscription?.plan === 'monthly' && userData?.subscription?.status === 'active') {
            userType = 'monthly';
          } else if (userData?.subscription?.plan === 'yearly' && userData?.subscription?.status === 'active') {
            userType = 'yearly';
          }
          
          // Just push basic data - no API call needed
          users.push({
            uid: doc.id,
            email: userData.email,
            displayName: userData.displayName,
            userType: userType,
            subscription: userData.subscription,
            // Empty data for now - will be fetched when user is clicked
            limits: {},
            usage: {},
            features: []
          });
        }
        
        setRecentUsers([...users]);
        
      } catch (queryError) {
        console.error('Error with simple query:', queryError);
        
        // If even simple query fails, there might be a permission issue
        if (queryError instanceof Error && queryError.message.includes('permission')) {
          console.error('Permission issue detected. Make sure admin has access to users collection.');
        }
      }
      
    } catch (error) {
      console.error('Error loading recent users:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
    }
  };

  // Removed buildUserEntitlementData - now using API

  // Helper function for resetting usage
  const resetFeatureUsage = async (userId: string, featureId: string, type: 'daily' | 'total') => {
    try {
      const response = await fetch('/api/admin/user-entitlements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-id': user?.uid || 'unknown'
        },
        body: JSON.stringify({ userId, feature: featureId, type })
      });
      
      if (response.ok) {
        alert('Usage reset successfully');
        // Refresh the user data
        if (selectedUser) {
          searchUser();
        }
      } else {
        alert('Failed to reset usage');
      }
    } catch (error) {
      console.error('Error resetting usage:', error);
      alert('Error resetting usage');
    }
  };

  const searchUser = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      // Search by email or UID
      const usersRef = collection(db, 'users');
      let q;
      
      if (searchQuery.includes('@')) {
        // Search by email
        q = query(usersRef, where('email', '==', searchQuery.trim()));
      } else {
        // Try to get by UID
        const userDoc = await getDoc(doc(db, 'users', searchQuery.trim()));
        if (userDoc.exists()) {
          // Use API to get full entitlement data
          const response = await fetch(`/api/admin/user-entitlements?userId=${userDoc.id}`);
          if (response.ok) {
            const data = await response.json();
            setSelectedUser({
              uid: data.user.uid,
              email: data.user.email,
              displayName: data.user.displayName,
              userType: data.user.userType,
              subscription: data.subscription,
              limits: data.limits,
              usage: data.usage,
              features: data.features,
              userStats: data.userStats,
              dailyActivities: data.dailyActivities
            });
            setActiveTab('details');
          } else {
            try {
              const errorData = await response.json();
              console.error('Failed to fetch user data:', response.status, errorData);
              alert(`Failed to fetch user data: ${errorData.error}\n\nDetails: ${errorData.details || 'No details available'}`);
            } catch (e) {
              const errorText = await response.text();
              console.error('Failed to fetch user data:', response.status, errorText);
              alert(`Failed to fetch user data: ${response.status} - ${errorText}`);
            }
          }
          setLoading(false);
          return;
        }
      }

      if (q) {
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          // Use API to get full entitlement data
          const response = await fetch(`/api/admin/user-entitlements?userId=${userDoc.id}`);
          if (response.ok) {
            const data = await response.json();
            setSelectedUser({
              uid: data.user.uid,
              email: data.user.email,
              displayName: data.user.displayName,
              userType: data.user.userType,
              subscription: data.subscription,
              limits: data.limits,
              usage: data.usage,
              features: data.features,
              userStats: data.userStats,
              dailyActivities: data.dailyActivities
            });
            setActiveTab('details');
          } else {
            try {
              const errorData = await response.json();
              console.error('Failed to fetch user data:', response.status, errorData);
              alert(`Failed to fetch user data: ${errorData.error}\n\nDetails: ${errorData.details || 'No details available'}`);
            } catch (e) {
              const errorText = await response.text();
              console.error('Failed to fetch user data:', response.status, errorText);
              alert(`Failed to fetch user data: ${response.status} - ${errorText}`);
            }
          }
        } else {
          alert('User not found');
        }
      }
    } catch (error) {
      console.error('Error searching user:', error);
      alert('Error searching user');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'exhausted':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'blocked':
        return <XCircle className="w-4 h-4 text-gray-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'exhausted':
        return 'bg-red-500';
      case 'blocked':
        return 'bg-gray-400';
      default:
        return 'bg-gray-200';
    }
  };

  const exportUserData = () => {
    if (!selectedUser) return;
    
    const dataStr = JSON.stringify(selectedUser, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `user-entitlements-${selectedUser.email}-${new Date().toISOString()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">User Entitlements & Usage</h1>
            <p className="text-gray-600 mt-1">
              View detailed entitlement information and usage quotas for any user
            </p>
          </div>
          <Button onClick={loadRecentUsers} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="search">Search User</TabsTrigger>
            <TabsTrigger value="recent">Recent Users</TabsTrigger>
            {selectedUser && <TabsTrigger value="details">User Details</TabsTrigger>}
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Search for User</CardTitle>
                <CardDescription>
                  Enter email address or user ID to view their entitlements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="Email or User ID"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchUser()}
                    className="flex-1"
                  />
                  <Button onClick={searchUser} disabled={loading}>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recent" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recently Active Users</CardTitle>
                <CardDescription>
                  Click on a user to view their entitlements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentUsers.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No recent users found</p>
                  ) : (
                    recentUsers.map((user) => (
                    <div
                      key={user.uid}
                      onClick={async () => {
                        setLoadingUserId(user.uid);
                        try {
                          // Fetch full entitlement data when user is clicked
                          const response = await fetch(`/api/admin/user-entitlements?userId=${user.uid}`);
                          if (response.ok) {
                            const data = await response.json();
                            setSelectedUser({
                              uid: data.user.uid,
                              email: data.user.email,
                              displayName: data.user.displayName,
                              userType: data.user.userType,
                              subscription: data.subscription,
                              limits: data.limits,
                              usage: data.usage,
                              features: data.features,
                              userStats: data.userStats,
                              dailyActivities: data.dailyActivities
                            });
                            setActiveTab('details');
                          } else {
                            console.error('Failed to fetch user details');
                            alert('Failed to fetch user details');
                          }
                        } catch (error) {
                          console.error('Error fetching user details:', error);
                          alert('Error fetching user details');
                        } finally {
                          setLoadingUserId(null);
                        }
                      }}
                      className={`p-3 border rounded-lg hover:bg-gray-50 cursor-pointer flex justify-between items-center ${
                        loadingUserId === user.uid ? 'opacity-50' : ''
                      }`}
                    >
                      <div>
                        <p className="font-medium">{user.email}</p>
                        <p className="text-sm text-gray-600">
                          {user.displayName || 'No display name'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {loadingUserId === user.uid && (
                          <RefreshCw className="w-4 h-4 animate-spin text-gray-500" />
                        )}
                        <Badge variant={user.userType === 'monthly' || user.userType === 'yearly' ? 'default' : 'secondary'}>
                          {user.userType}
                        </Badge>
                      </div>
                    </div>
                  )))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {selectedUser && (
            <TabsContent value="details" className="space-y-4">
              {/* Quick Status Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {selectedUser.features.filter(f => f.status === 'exhausted').length}
                    </div>
                    <p className="text-xs text-muted-foreground">Features at Limit</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {selectedUser.features.filter(f => f.status === 'warning').length}
                    </div>
                    <p className="text-xs text-muted-foreground">Features Near Limit</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {selectedUser.features.filter(f => f.status === 'available' && f.limit !== 0).length}
                    </div>
                    <p className="text-xs text-muted-foreground">Available Features</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {selectedUser.features.filter(f => f.limit === -1).length}
                    </div>
                    <p className="text-xs text-muted-foreground">Unlimited Features</p>
                  </CardContent>
                </Card>
              </div>

              {/* User Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    User Information
                    <Button onClick={exportUserData} variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export Data
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">{selectedUser.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">User Type</p>
                      <Badge variant={selectedUser.userType === 'monthly' || selectedUser.userType === 'yearly' ? 'default' : 'secondary'}>
                        {selectedUser.userType}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">User ID</p>
                      <p className="font-mono text-xs">{selectedUser.uid}</p>
                    </div>
                    {selectedUser.subscription && (
                      <div>
                        <p className="text-sm text-gray-600">Renewal Date</p>
                        <p className="font-medium">
                          {selectedUser.subscription.renewalDate 
                            ? format(new Date(selectedUser.subscription.renewalDate), 'MMM dd, yyyy')
                            : 'N/A'}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Feature Usage Grid */}
              <Card>
                <CardHeader>
                  <CardTitle>Feature Usage & Quotas</CardTitle>
                  <CardDescription>
                    Real-time usage tracking across all features
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {['learning', 'games', 'storage', 'system'].map(category => {
                      const categoryFeatures = selectedUser.features.filter(f => f.category === category);
                      if (categoryFeatures.length === 0) return null;

                      return (
                        <div key={category}>
                          <h3 className="font-semibold text-lg mb-3 capitalize">{category} Features</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {categoryFeatures.map(feature => (
                              <div key={feature.id} className="border rounded-lg p-3">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                    {getStatusIcon(feature.status)}
                                    <span className="font-medium">{feature.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {feature.limitType !== 'none' && (
                                      <Badge variant="outline" className="text-xs">
                                        {feature.limitType}
                                      </Badge>
                                    )}
                                    {feature.used > 0 && feature.limit !== -1 && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-2 text-xs"
                                        onClick={() => resetFeatureUsage(selectedUser.uid, feature.id, feature.limitType as 'daily' | 'total')}
                                      >
                                        Reset
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                
                                {feature.limit !== 0 && (
                                  <>
                                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                                      <span>
                                        {feature.limit === -1 ? 'Unlimited' : `${feature.used} / ${feature.limit} used`}
                                      </span>
                                      {feature.limit !== -1 && (
                                        <span>{Math.round(feature.percentUsed)}%</span>
                                      )}
                                    </div>
                                    
                                    {feature.limit !== -1 && (
                                      <Progress 
                                        value={feature.percentUsed} 
                                        className="h-2"
                                        indicatorClassName={getStatusColor(feature.status)}
                                      />
                                    )}
                                    
                                    {feature.resetTime && feature.limitType === 'daily' && (
                                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Resets {format(new Date(feature.resetTime), 'h:mm a')}
                                      </p>
                                    )}
                                  </>
                                )}
                                
                                {feature.limit === 0 && (
                                  <p className="text-sm text-gray-500">No access</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* User Progress & Stats */}
              <Card>
                  <CardHeader>
                    <CardTitle>User Progress & Activity</CardTitle>
                    <CardDescription>
                      Learning progress and activity metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Progress Summary */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-blue-50 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">📖</span>
                            <span className="text-sm text-gray-600">Stories Today</span>
                          </div>
                          <p className="text-2xl font-bold">
                            {selectedUser.userStats?.storyStats?.storiesReadToday || 0}
                          </p>
                          {selectedUser.userStats?.storyStats?.lastStoryDate && (
                            <p className="text-xs text-gray-500 mt-1">
                              Last: {format(new Date(selectedUser.userStats.storyStats.lastStoryDate), 'MMM dd')}
                            </p>
                          )}
                        </div>
                        
                        <div className="bg-green-50 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">漢</span>
                            <span className="text-sm text-gray-600">Kanji Learned</span>
                          </div>
                          <p className="text-2xl font-bold">
                            {selectedUser.userStats?.learnedKanjiSet?.length || 0}
                          </p>
                        </div>
                        
                        <div className="bg-purple-50 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">📝</span>
                            <span className="text-sm text-gray-600">Words Learned</span>
                          </div>
                          <p className="text-2xl font-bold">
                            {selectedUser.userStats?.learnedWordsSet?.length || 0}
                          </p>
                        </div>
                        
                        <div className="bg-yellow-50 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">🎮</span>
                            <span className="text-sm text-gray-600">Pokémon Caught</span>
                          </div>
                          <p className="text-2xl font-bold">
                            {selectedUser.userStats?.caughtPokemonSet?.length || 0}
                          </p>
                        </div>
                      </div>

                      {/* Daily Activity Heatmap */}
                      {selectedUser.dailyActivities && selectedUser.dailyActivities.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-3">Recent Daily Activity</h4>
                          <div className="space-y-2">
                            {selectedUser.dailyActivities.slice(0, 7).map((activity) => (
                              <div key={activity.date} className="flex items-center gap-3 p-2 border rounded-lg">
                                <span className="text-sm font-medium w-24">
                                  {format(new Date(activity.date), 'MMM dd')}
                                </span>
                                <div className="flex gap-4 text-sm">
                                  {activity.storiesReadToday > 0 && (
                                    <span className="text-blue-600">📖 {activity.storiesReadToday} stories</span>
                                  )}
                                  {activity.drillsToday > 0 && (
                                    <span className="text-green-600">✏️ {activity.drillsToday} drills</span>
                                  )}
                                  {activity.kanjiQuestToday > 0 && (
                                    <span className="text-purple-600">🎮 {activity.kanjiQuestToday} games</span>
                                  )}
                                  {activity.kanaDropToday > 0 && (
                                    <span className="text-pink-600">🌸 {activity.kanaDropToday} kana drops</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Last Updated */}
                      {selectedUser.userStats?.lastUpdated && (
                        <p className="text-xs text-gray-500">
                          Stats last updated: {format(new Date(selectedUser.userStats.lastUpdated.seconds * 1000), 'MMM dd, yyyy h:mm a')}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

              {/* Raw Data (Debug) */}
              <Card>
                <CardHeader>
                  <CardTitle>Raw Usage Data</CardTitle>
                  <CardDescription>
                    Complete usage tracking data from Firebase
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Daily Usage:</h4>
                      <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-xs">
                        {JSON.stringify(selectedUser.usage.daily || {}, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Total Usage:</h4>
                      <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-xs">
                        {JSON.stringify(selectedUser.usage.total || {}, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Shared Limit Groups:</h4>
                      <div className="bg-gray-100 p-4 rounded-lg text-xs">
                        <p><strong>drill_practice group includes:</strong> kana_study, flashcard_review, drill_practice</p>
                        <p><strong>games group includes:</strong> All game features</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AdminLayout>
  );
}