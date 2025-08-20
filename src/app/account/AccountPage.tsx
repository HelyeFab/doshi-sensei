'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthErrorMessage } from '@/utils/authErrorMessages';
import { useToast } from '@/components/Toast';
import SmartHeader from '@/components/SmartHeader';
import { useRouter } from 'next/navigation';

export default function AccountPage() {
  const { user, userType, subscription, loading: authLoading, signInWithEmail, signUpWithEmail, signInWithGoogle, logout, resetPassword } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (showResetPassword) {
        await resetPassword(email);
        toast.success('Password reset email sent', 'Check your inbox for instructions');
        setShowResetPassword(false);
        setEmail('');
      } else if (isLogin) {
        await signInWithEmail(email, password);
        toast.success('Welcome back!', 'You have signed in successfully');
      } else {
        // Sign up
        if (password !== confirmPassword) {
          toast.error('Passwords do not match');
          setIsLoading(false);
          return;
        }
        
        if (password.length < 6) {
          toast.error('Password too weak', 'Password must be at least 6 characters');
          setIsLoading(false);
          return;
        }
        
        await signUpWithEmail(email, password, displayName);
        toast.success('Account created!', 'Welcome to Dōshi Sensei');
      }
      
      // Clear form
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setDisplayName('');
    } catch (error: any) {
      const message = getAuthErrorMessage(error.code);
      toast.error('Authentication failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      toast.success('Welcome!', 'You have signed in with Google');
    } catch (error: any) {
      // Don't show error if user just closed the popup
      if (error.code && error.code !== 'auth/popup-closed-by-user') {
        const message = getAuthErrorMessage(error.code);
        toast.error('Google sign-in failed', message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.info('Signed out', 'You have been signed out successfully');
      router.push('/');
    } catch (error) {
      toast.error('Logout failed', 'Could not sign out. Please try again.');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SmartHeader title="Account" />
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-muted">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // If user is logged in, show account info
  if (user) {
    return (
      <div className="min-h-screen bg-background">
        <SmartHeader title="My Account" />
        
        <div className="px-4 pb-20 max-w-2xl mx-auto">
          {/* User Info Card */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-4">
            <h2 className="text-lg font-semibold text-foreground mb-4">Account Information</h2>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted">Email</p>
                <p className="text-foreground">{user.email}</p>
              </div>
              
              {user.displayName && (
                <div>
                  <p className="text-sm text-muted">Display Name</p>
                  <p className="text-foreground">{user.displayName}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm text-muted">Account Type</p>
                <p className="text-foreground capitalize">
                  {userType === 'premium' ? '⭐ Premium' : userType === 'free' ? 'Free' : 'Guest'}
                </p>
              </div>
              
              {subscription && subscription.plan !== 'free' && (
                <div>
                  <p className="text-sm text-muted">Subscription</p>
                  <p className="text-foreground capitalize">
                    {subscription.plan} - {subscription.status}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Subscription Card */}
          {userType !== 'premium' && (
            <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-4">
              <h2 className="text-lg font-semibold text-foreground mb-4">Upgrade to Premium</h2>
              <p className="text-muted mb-4">
                Unlock unlimited access to all features including AI stories, unlimited games, and more!
              </p>
              <button
                onClick={() => router.push('/pricing')}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                View Plans
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleLogout}
              className="w-full bg-card text-foreground border border-border px-4 py-3 rounded-lg font-medium hover:bg-muted/20 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show login/signup form
  return (
    <div className="min-h-screen bg-background">
      <SmartHeader title={showResetPassword ? 'Reset Password' : isLogin ? 'Sign In' : 'Create Account'} />
      
      <div className="px-4 pb-20 max-w-md mx-auto">
        <form onSubmit={handleSubmit} className="bg-card rounded-lg shadow-sm border border-border p-6 space-y-4">
          {/* Display Name (signup only) */}
          {!isLogin && !showResetPassword && (
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-foreground mb-1">
                Display Name
              </label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Your name"
              />
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="your@email.com"
              required
            />
          </div>

          {/* Password */}
          {!showResetPassword && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
                required={!showResetPassword}
                minLength={6}
              />
            </div>
          )}

          {/* Confirm Password (signup only) */}
          {!isLogin && !showResetPassword && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : showResetPassword ? 'Send Reset Email' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Google Sign In */}
        {!showResetPassword && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-background text-muted">Or continue with</span>
              </div>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-card border border-border rounded-lg py-2 px-4 hover:bg-muted/10 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </button>
          </>
        )}

        {/* Toggle between modes */}
        <div className="mt-6 text-center text-sm text-muted">
          {showResetPassword ? (
            <>
              Remember your password?{' '}
              <button
                onClick={() => {
                  setShowResetPassword(false);
                  setIsLogin(true);
                }}
                className="text-primary hover:underline"
              >
                Sign in
              </button>
            </>
          ) : isLogin ? (
            <>
              Don't have an account?{' '}
              <button
                onClick={() => setIsLogin(false)}
                className="text-primary hover:underline"
              >
                Sign up
              </button>
              <br />
              <button
                onClick={() => setShowResetPassword(true)}
                className="text-primary hover:underline mt-2"
              >
                Forgot password?
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => setIsLogin(true)}
                className="text-primary hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}