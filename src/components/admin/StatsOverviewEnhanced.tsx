'use client';

import { useState, useEffect } from 'react';
import { useAdminStats } from '@/hooks/useAdminStats';
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { X, User, Calendar, Activity, TrendingUp, Mail, Clock } from 'lucide-react';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any[];
  loading: boolean;
}

function DetailModal({ isOpen, onClose, title, data, loading }: DetailModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden border border-border">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No data available
            </div>
          ) : (
            <div className="space-y-3">
              {data.map((item, index) => (
                <div key={index} className="bg-muted/50 rounded-lg p-4">
                  {item.email && (
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{item.email}</span>
                    </div>
                  )}
                  {item.displayName && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>{item.displayName}</span>
                    </div>
                  )}
                  {item.createdAt && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                      <Calendar className="w-4 h-4" />
                      <span>Joined: {new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  )}
                  {item.lastLoginAt && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>Last active: {new Date(item.lastLoginAt).toLocaleString()}</span>
                    </div>
                  )}
                  {item.subscription && (
                    <div className="mt-2 pt-2 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          item.subscription.plan === 'monthly' ? 'bg-primary/10 text-primary' :
                          item.subscription.plan === 'yearly' ? 'bg-accent/10 text-accent' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {item.subscription.plan?.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          item.subscription.status === 'active' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {item.subscription.status}
                        </span>
                      </div>
                    </div>
                  )}
                  {item.activity && (
                    <div className="mt-2">
                      <div className="text-sm text-muted-foreground">
                        <div>Drills: {item.activity.drillsCompleted || 0}</div>
                        <div>Games: {item.activity.gamesPlayed || 0}</div>
                        <div>XP: {item.activity.totalXP || 0}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  loading?: boolean;
  onClick?: () => void;
  clickable?: boolean;
}

function StatsCard({ 
  title, 
  value, 
  icon, 
  trend, 
  trendDirection = 'neutral', 
  loading,
  onClick,
  clickable = false
}: StatsCardProps) {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-muted-foreground',
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse"></div>
            <div className="h-8 bg-muted rounded animate-pulse w-20"></div>
            <div className="h-3 bg-muted rounded animate-pulse w-16"></div>
          </div>
          <div className="text-3xl opacity-50">{icon}</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`bg-card border border-border rounded-lg p-4 sm:p-6 transition-all ${
        clickable ? 'hover:shadow-md cursor-pointer hover:border-primary' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm text-muted-foreground truncate">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground">{value}</p>
          {trend && (
            <p className={`text-xs mt-1 ${trendColors[trendDirection]} truncate`}>
              {trendDirection === 'up' && '↗ '}
              {trendDirection === 'down' && '↘ '}
              {trend}
            </p>
          )}
        </div>
        <div className="text-2xl sm:text-3xl flex-shrink-0">{icon}</div>
      </div>
    </div>
  );
}

export function StatsOverviewEnhanced() {
  const { userStats, subscriptionStats, featureStats, loading, error } = useAdminStats();
  const [selectedModal, setSelectedModal] = useState<string | null>(null);
  const [modalData, setModalData] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSubtitle, setModalSubtitle] = useState<string>('');

  const fetchDetailedData = async (type: string) => {
    setModalLoading(true);
    setModalData([]);
    
    try {
      const usersRef = collection(db, 'users');
      let data: any[] = [];
      
      switch(type) {
        case 'total-users':
          const allUsersSnapshot = await getDocs(usersRef);
          data = allUsersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
            lastLoginAt: doc.data().lastLoginAt?.toDate?.()?.toISOString() || doc.data().lastLoginAt
          }));
          break;
          
        case 'new-users-today':
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayTimestamp = Timestamp.fromDate(today);
          
          console.log('Fetching new users since:', today.toISOString());
          
          const newUsersQuery = query(
            usersRef,
            where('createdAt', '>=', todayTimestamp),
            orderBy('createdAt', 'desc')
          );
          const newUsersSnapshot = await getDocs(newUsersQuery);

          // If no users found today, try to get users from the last 24 hours as fallback
          if (newUsersSnapshot.empty) {
            const last24Hours = new Date();
            last24Hours.setHours(last24Hours.getHours() - 24);
            const last24HoursTimestamp = Timestamp.fromDate(last24Hours);
            
            console.log('No users today, checking last 24 hours since:', last24Hours.toISOString());
            
            const last24HoursQuery = query(
              usersRef,
              where('createdAt', '>=', last24HoursTimestamp),
              orderBy('createdAt', 'desc')
            );
            const last24HoursSnapshot = await getDocs(last24HoursQuery);

            // If still no users in last 24 hours, get the most recent users
            if (last24HoursSnapshot.empty) {

              const recentUsersQuery = query(
                usersRef,
                orderBy('createdAt', 'desc'),
                limit(10)
              );
              const recentUsersSnapshot = await getDocs(recentUsersQuery);

              data = recentUsersSnapshot.docs.map(doc => {
                const userData = doc.data();
                return {
                  id: doc.id,
                  ...userData,
                  createdAt: userData.createdAt?.toDate?.()?.toISOString() || userData.createdAt,
                  lastLoginAt: userData.lastLoginAt?.toDate?.()?.toISOString() || userData.lastLoginAt
                };
              });
              setModalSubtitle('(Most recent users)');
            } else {
              data = last24HoursSnapshot.docs.map(doc => {
                const userData = doc.data();
                return {
                  id: doc.id,
                  ...userData,
                  createdAt: userData.createdAt?.toDate?.()?.toISOString() || userData.createdAt,
                  lastLoginAt: userData.lastLoginAt?.toDate?.()?.toISOString() || userData.lastLoginAt
                };
              });
              setModalSubtitle('(Last 24 hours)');
            }
          } else {
            data = newUsersSnapshot.docs.map(doc => {
              const userData = doc.data();
              return {
                id: doc.id,
                ...userData,
                createdAt: userData.createdAt?.toDate?.()?.toISOString() || userData.createdAt,
                lastLoginAt: userData.lastLoginAt?.toDate?.()?.toISOString() || userData.lastLoginAt
              };
            });
            setModalSubtitle('');
          }
          break;
          
        case 'active-today':
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const activeTimestamp = Timestamp.fromDate(todayStart);
          
          const activeQuery = query(
            usersRef,
            where('lastLoginAt', '>=', activeTimestamp),
            orderBy('lastLoginAt', 'desc')
          );
          const activeSnapshot = await getDocs(activeQuery);
          data = activeSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
            lastLoginAt: doc.data().lastLoginAt?.toDate?.()?.toISOString()
          }));
          break;
          
        case 'registered-users':
          const registeredSnapshot = await getDocs(usersRef);
          data = registeredSnapshot.docs
            .filter(doc => doc.data().email)
            .map(doc => ({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
              lastLoginAt: doc.data().lastLoginAt?.toDate?.()?.toISOString()
            }));
          break;
          
        case 'free-users':
          const freeUsersSnapshot = await getDocs(usersRef);
          data = freeUsersSnapshot.docs
            .filter(doc => {
              const sub = doc.data().subscription;
              return !sub || sub.plan === 'free' || (sub.plan !== 'monthly' && sub.plan !== 'yearly');
            })
            .map(doc => ({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
              lastLoginAt: doc.data().lastLoginAt?.toDate?.()?.toISOString()
            }));
          break;
          
        case 'premium-users':
          // Note: Firestore doesn't support querying nested fields with dot notation in compound queries
          // So we fetch all users and filter in memory
          const allPremiumSnapshot = await getDocs(usersRef);
          data = allPremiumSnapshot.docs
            .filter(doc => {
              const sub = doc.data().subscription;
              return sub?.plan === 'monthly' || sub?.plan === 'yearly';
            })
            .map(doc => ({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
              lastLoginAt: doc.data().lastLoginAt?.toDate?.()?.toISOString()
            }));
          break;
          
        case 'monthly-subscribers':
          // Fetch all users and filter for monthly subscribers
          const allMonthlySnapshot = await getDocs(usersRef);
          data = allMonthlySnapshot.docs
            .filter(doc => {
              const sub = doc.data().subscription;
              return sub?.plan === 'monthly';
            })
            .map(doc => ({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
              lastLoginAt: doc.data().lastLoginAt?.toDate?.()?.toISOString()
            }));
          break;
          
        case 'yearly-subscribers':
          // Fetch all users and filter for yearly subscribers
          const allYearlySnapshot = await getDocs(usersRef);
          data = allYearlySnapshot.docs
            .filter(doc => {
              const sub = doc.data().subscription;
              return sub?.plan === 'yearly';
            })
            .map(doc => ({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
              lastLoginAt: doc.data().lastLoginAt?.toDate?.()?.toISOString()
            }));
          break;
      }
      
      setModalData(data);
    } catch (error) {
      console.error('Error fetching detailed data:', error);
      setModalData([]);
    } finally {
      setModalLoading(false);
    }
  };

  const handleCardClick = (type: string, title: string) => {
    setSelectedModal(title);
    fetchDetailedData(type);
  };

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <div className="text-2xl">⚠️</div>
          <div>
            <h3 className="font-medium text-destructive">
              Failed to load statistics
            </h3>
            <p className="text-sm text-destructive/80">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate real metrics
  const totalPremium = (subscriptionStats?.monthlySubscribers ?? 0) + (subscriptionStats?.yearlySubscribers ?? 0);
  const conversionRate = userStats?.registeredUsers 
    ? (totalPremium / userStats.registeredUsers * 100).toFixed(1)
    : '0.0';

  const userGrowthTrend = userStats?.newUsersThisWeek ? `+${userStats.newUsersThisWeek} this week` : undefined;

  return (
    <>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">User Statistics</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <StatsCard
              title="Total Users"
              value={userStats?.totalUsers ?? 0}
              icon="👥"
              trend={userGrowthTrend}
              trendDirection="up"
              loading={loading}
              clickable={true}
              onClick={() => handleCardClick('total-users', 'Total Users')}
            />
            <StatsCard
              title="New Users Today"
              value={userStats?.newUsersToday ?? 0}
              icon="🆕"
              loading={loading}
              clickable={true}
              onClick={() => handleCardClick('new-users-today', 'New Users Today')}
            />
            <StatsCard
              title="Active Today"
              value={userStats?.activeUsersToday ?? 0}
              icon="⚡"
              loading={loading}
              clickable={true}
              onClick={() => handleCardClick('active-today', 'Active Users Today')}
            />
            <StatsCard
              title="Registered Users"
              value={userStats?.registeredUsers ?? 0}
              icon="✅"
              trend={`${userStats?.guestUsers ?? 0} guests`}
              trendDirection="neutral"
              loading={loading}
              clickable={true}
              onClick={() => handleCardClick('registered-users', 'Registered Users')}
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Subscription Statistics</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <StatsCard
              title="Free Users"
              value={subscriptionStats?.freeUsers ?? 0}
              icon="🆓"
              loading={loading}
              clickable={true}
              onClick={() => handleCardClick('free-users', 'Free Users')}
            />
            <StatsCard
              title="Premium Users"
              value={totalPremium}
              icon="⭐"
              trend={`${conversionRate}% conversion`}
              trendDirection={totalPremium > 0 ? "up" : "neutral"}
              loading={loading}
              clickable={true}
              onClick={() => handleCardClick('premium-users', 'Premium Users')}
            />
            <StatsCard
              title="Monthly Subscribers"
              value={subscriptionStats?.monthlySubscribers ?? 0}
              icon="📅"
              loading={loading}
              clickable={true}
              onClick={() => handleCardClick('monthly-subscribers', 'Monthly Subscribers')}
            />
            <StatsCard
              title="Yearly Subscribers"
              value={subscriptionStats?.yearlySubscribers ?? 0}
              icon="🗓️"
              loading={loading}
              clickable={true}
              onClick={() => handleCardClick('yearly-subscribers', 'Yearly Subscribers')}
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Feature Usage</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <StatsCard
              title="Drills Today"
              value={featureStats?.drillsCompletedToday ?? 0}
              icon="💪"
              loading={loading}
            />
            <StatsCard
              title="Vocabulary Searches"
              value={featureStats?.vocabularySearchesToday ?? 0}
              icon="🔍"
              loading={loading}
            />
            <StatsCard
              title="Mood Board Views"
              value={featureStats?.moodBoardViewsToday ?? 0}
              icon="🎨"
              loading={loading}
            />
            <StatsCard
              title="Avg Session (min)"
              value={featureStats?.averageSessionDuration?.toFixed(1) ?? '0.0'}
              icon="⏱️"
              loading={loading}
            />
          </div>
        </div>
      </div>

      <DetailModal
        isOpen={selectedModal !== null}
        onClose={() => {
          setSelectedModal(null);
          setModalSubtitle('');
        }}
        title={`${selectedModal || ''} ${modalSubtitle}`}
        data={modalData}
        loading={modalLoading}
      />
    </>
  );
}