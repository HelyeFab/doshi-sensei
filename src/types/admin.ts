export const ADMIN_EMAIL = "emmanuelfabiani23@gmail.com";

// User statistics interfaces
export interface UserStats {
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  activeUsersToday: number;
  guestUsers: number;
  registeredUsers: number;
}

export interface SubscriptionStats {
  freeUsers: number;
  monthlySubscribers: number;
  yearlySubscribers: number;
  conversionRate: number;
  monthlyRecurringRevenue: number;
  averageRevenuePerUser: number;
}

export interface FeatureStats {
  drillsCompletedToday: number;
  vocabularySearchesToday: number;
  moodBoardViewsToday: number;
  mostPopularMoodBoard: string;
  averageSessionDuration: number;
}

// Admin action logging
export interface AdminLog {
  id: string;
  action: string;
  adminEmail: string;
  targetUserId?: string;
  targetMoodBoardId?: string;
  details: Record<string, any>;
  timestamp: Date;
}

export type AdminAction =
  | 'user_upgraded_to_premium'
  | 'mood_board_created'
  | 'mood_board_updated'
  | 'mood_board_deleted'
  | 'user_searched'
  | 'dashboard_accessed';

// Admin user management
export interface AdminUserDetails {
  id: string;
  email: string;
  displayName?: string;
  subscription: import('@/types/subscription').UserSubscription;
  createdAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
}

// Admin dashboard sections
export type AdminSection = 'dashboard' | 'users' | 'mood-boards' | 'logs';

// Admin context type
export interface AdminContextType {
  isAdmin: boolean;
  loading: boolean;
  currentSection: AdminSection;
  setCurrentSection: (section: AdminSection) => void;
}
