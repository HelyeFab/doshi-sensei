'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import SubscriptionPlans from '@/components/SubscriptionPlans';
import StatsManager, { UserStats } from '@/utils/stats';
import CompanionTrigger from '@/components/CompanionTrigger';
import AuthErrorModal from '@/components/AuthErrorModal';
import { ADMIN_EMAIL } from '@/types/admin';
import Link from 'next/link';

export default function AccountPage() {
  const { user, loading: authLoading, signInWithEmail, signUpWithEmail, signInWithGoogle, logout, resetPassword } = useAuth();
  const { userSubscription, loading: subLoading } = useSubscription();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Load user stats when logged in
  useEffect(() => {
    if (user) {
      // Initialize StatsManager with user context and cloud sync capability
      const canSync = userSubscription?.subscription?.status === 'active';
        userEmail: user.email,
        userUID: user.uid,
        subscriptionStatus: userSubscription?.subscription?.status,
        canSync: canSync,
        hasSubscription: !!userSubscription,
        subscriptionData: userSubscription
      });
      StatsManager.setUser(user, canSync);

      loadUserStats();
    } else {
      // Clear user context when logged out
      StatsManager.setUser(null, false);
    }
  }, [user, userSubscription]);

  // Reload stats when page becomes visible/focused
  useEffect(() => {
    if (!user) return;

    const handleFocus = () => {
      loadUserStats();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadUserStats();
      }
    };

    // Listen for when user returns to this tab/page
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const loadUserStats = async () => {
    try {
      setStatsLoading(true);
      const stats = await StatsManager.getUserStats();
      setUserStats(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Basic validation
    if (!email || !password) {
      setError('Please fill in all required fields');
      setIsLoading(false);
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      if (isLogin) {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, displayName);
      }
      // Clear form
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setDisplayName('');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);

    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google sign in failed');
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      // Clear form
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setDisplayName('');
    } catch (err: any) {
      setError(err.message || 'An error occurred during logout');
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }

    try {
      await resetPassword(email);
      setError(''); // Clear any existing errors
      alert('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    }
  };

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (user) {
    return (
      <>
        {/* Virtual Companion Section - 1/6th of screen height */}
        <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />

          {/* Gradient to White Fade */}
          <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />

          {/* Virtual Companion Button positioned within this section */}
          <CompanionTrigger />
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8 min-h-screen">
          <PageHeader title="Account" />

          <main className="max-w-4xl mx-auto mb-32 md:mb-8 pb-safe">
          <div className="space-y-6">
            {/* User Info Card */}
            <div
              className="bg-card rounded-lg p-6"
              style={{
                border: '2px solid white',
                boxShadow: 'inset 0 0 0 1px var(--primary), 0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              <div className="flex items-center space-x-4 mb-6">
                {/* User Avatar */}
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={`${user.displayName || user.email}'s profile`}
                    className="w-16 h-16 rounded-full"
                    style={{
                      boxShadow: '0 0 0 2px white, 0 0 0 4px var(--primary), 0 4px 12px rgba(0,0,0,0.15)'
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-2xl">👤</span>
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{user.displayName}</h2>
                  <p className="text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Account Status</span>
                  <span className="text-sm text-green-500 font-medium">Active</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">Member Since</span>
                  <span className="text-sm text-muted-foreground">
                    {user.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Today'}
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Access Section - Only show for admin user */}
            {user.email === ADMIN_EMAIL && (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🛡️</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
                      Administrator Access
                    </h3>
                    <p className="text-sm text-red-600 dark:text-red-300">
                      Manage users, content, and system settings
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/admin"
                    className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium text-sm"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Admin Dashboard
                  </Link>

                  <Link
                    href="/admin/users"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                    User Management
                  </Link>

                  <Link
                    href="/admin/mood-boards"
                    className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium text-sm"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                    Mood Boards
                  </Link>
                </div>

                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.866-.833-2.5 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        Admin Privileges Active
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">
                        You have full access to system administration features. Use these tools responsibly.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Stats Dashboard */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                <span className="text-2xl mr-2">📊</span>
                Your Progress
              </h3>

              {statsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : userStats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {userStats.totalDaysUsed}
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">
                      Days Used
                    </div>
                  </div>

                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {userStats.drillsCompleted}
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400">
                      Drills Completed
                    </div>
                  </div>

                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {Math.round(userStats.accuracy)}%
                    </div>
                    <div className="text-sm text-purple-600 dark:text-purple-400">
                      Accuracy
                    </div>
                  </div>

                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {userStats.currentStreak}
                    </div>
                    <div className="text-sm text-orange-600 dark:text-orange-400">
                      Streak
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="text-4xl mb-2">🎯</div>
                  <p>Complete your first drill to see stats!</p>
                </div>
              )}

              {userStats && userStats.drillsCompleted > 0 && (
                <div className="mt-6 pt-4 border-t border-border">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Days Active:</span>
                      <span className="font-medium text-foreground">{userStats.totalDaysUsed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Best Streak:</span>
                      <span className="font-medium text-foreground">{userStats.longestStreak} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Active:</span>
                      <span className="font-medium text-foreground">
                        {new Date(userStats.lastActiveDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Subscription Management */}
            {subLoading ? (
              <div className="bg-card border border-border rounded-lg p-6 flex items-center justify-center">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <SubscriptionPlans />
            )}

            {/* Logout */}
            <div className="bg-card border border-border rounded-lg p-4">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Error Modal */}
      <AuthErrorModal
        isOpen={showErrorModal}
        error={error}
        onClose={() => setShowErrorModal(false)}
      />
      </>
    );
  }

  return (
    <>
      {/* Virtual Companion Section - 1/6th of screen height */}
      <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />

        {/* Gradient to White Fade */}
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />

        {/* Virtual Companion Button positioned within this section */}
        <CompanionTrigger />
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 min-h-screen">
        <PageHeader title="Account" />

        <main className="max-w-md mx-auto mb-32 md:mb-8 pb-safe">
        <div className="bg-card border border-border rounded-lg p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">🏮</div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-muted-foreground">
              {isLogin
                ? 'Sign in to sync your progress across devices'
                : 'Join Doshi Sensei to save your progress'
              }
            </p>
          </div>


          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-3 px-4 py-3 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="text-foreground font-medium">
              {isLogin ? 'Sign in with Google' : 'Sign up with Google'}
            </span>
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-foreground mb-2">
                  Display Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Your name"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="your.email@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter your password"
                required
              />
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Confirm your password"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full"></div>
                  <span>{isLogin ? 'Signing in...' : 'Creating account...'}</span>
                </div>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {/* Toggle Login/Register */}
          <div className="text-center mt-6">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-primary hover:text-primary/80 transition-colors text-sm"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'
              }
            </button>
          </div>

          {/* Forgot Password Link (only show on login) */}
          {isLogin && (
            <div className="text-center mt-3">
              <button
                onClick={handleForgotPassword}
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                Forgot your password?
              </button>
            </div>
          )}
        </div>
      </main>
    </div>

    {/* Error Modal */}
    <AuthErrorModal
      isOpen={showErrorModal}
      error={error}
      onClose={() => setShowErrorModal(false)}
    />
    </>
  );
}
