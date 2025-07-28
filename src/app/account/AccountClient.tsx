'use client';

import { useState, useEffect } from 'react';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { useFeature } from '@/hooks/useFeature';
import { useNotification } from '@/contexts/NotificationContext';
import SubscriptionPlans from '@/components/SubscriptionPlans';
import SubscriptionHistory from '@/components/SubscriptionHistory';
import AuthErrorModal from '@/components/AuthErrorModal';
import DeleteAccountModal from '@/components/DeleteAccountModal';
import { ADMIN_EMAIL } from '@/types/admin';
import Link from 'next/link'
import { SmartNavigationLink } from '@/components/navigation/SmartNavigationLink';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { useUserProfile } from '@/hooks/useUserProfile';
import UserAvatar from '@/components/UserAvatar';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import { useStrings } from '@/contexts/LanguageContext';
import { DetailedStats } from '@/components/stats/DetailedStats';
import { validatePassword, passwordRequirements, getPasswordStrength } from '@/utils/passwordValidation';
import { checkEmailAvailability, debounce } from '@/utils/emailValidation';
import { useCallback } from 'react';

// List of available SVGs for user thumbnails
const THUMBNAIL_OPTIONS = [
  // Animals
  '/flat-icons/4193242-animals/svg/026-squirrel.svg',
  '/flat-icons/4193242-animals/svg/020-goat.svg',
  '/flat-icons/4193242-animals/svg/019-llama.svg',
  '/flat-icons/4193242-animals/svg/015-alpaca.svg',
  '/flat-icons/4193242-animals/svg/010-rabbit.svg',
  '/flat-icons/4193242-animals/svg/008-hedgehog.svg',
  '/flat-icons/4193242-animals/svg/007-pig.svg',
  '/flat-icons/4193242-animals/svg/006-cow.svg',
  '/flat-icons/4193242-animals/svg/005-horse.svg',
  '/flat-icons/4193242-animals/svg/004-sheep.svg',
  '/flat-icons/4193242-animals/svg/003-flamingo.svg',
  '/flat-icons/4193242-animals/svg/002-buffalo.svg',
  // Summer Watermelon
  '/flat-icons/17517790-summer-watermelon/svg/020-ok.svg',
  '/flat-icons/17517790-summer-watermelon/svg/018-valentin-day.svg',
  '/flat-icons/17517790-summer-watermelon/svg/014-angel.svg',
  '/flat-icons/17517790-summer-watermelon/svg/013-wow.svg',
  '/flat-icons/17517790-summer-watermelon/svg/011-laugh-emoji.svg',
  '/flat-icons/17517790-summer-watermelon/svg/002-love.svg',
  '/flat-icons/17517790-summer-watermelon/svg/001-happy.svg',
  // Wild Animals
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/001-raccoon.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/002-zebra.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/003-bear.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/004-cheetah.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/005-fox.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/006-leopard.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/007-giraffe.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/008-koala.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/009-panda-bear.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/010-tiger.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/012-sloth.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/013-hippopotamus.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/014-rhinoceros.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/015-monkey.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/016-deer.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/019-lion.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/020-elephant.svg',
  // Education icons
  '/flat-icons/4341021-education/svg/011-book.svg',
  '/flat-icons/4341021-education/svg/017-dictionary.svg',
  '/flat-icons/4341021-education/svg/025-medal.svg',
  '/flat-icons/4341021-education/svg/037-trophy.svg',
];

export default function AccountClient() {
  const { user, loading: authLoading, signInWithEmail, signUpWithEmail, signInWithGoogle, logout, resetPassword, deleteAccount } = useAuth();
  const { subscription, isPremium, userType, isLoading: subLoading } = useSubscription2();
  const { showNotification } = useNotification();
  const strings = useStrings();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalType, setModalType] = useState<'error' | 'success'>('error');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const [expandRequirements, setExpandRequirements] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Show password requirements section when in signup mode
  useEffect(() => {
    setShowPasswordRequirements(!isLogin);
    setExpandRequirements(false); // Reset expansion when switching modes
    setEmailAvailable(null); // Reset email availability when switching modes
  }, [isLogin]);

  // Debounced email availability check
  const checkEmail = useCallback(
    debounce(async (emailToCheck: string) => {
      if (!emailToCheck || isLogin) return;
      
      setCheckingEmail(true);
      const { isAvailable } = await checkEmailAvailability(emailToCheck);
      setEmailAvailable(isAvailable);
      setCheckingEmail(false);
    }, 500),
    [isLogin]
  );

  // Use the new profile hook
  const { profile } = useUserProfile();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Basic validation
    if (!email || !password) {
      setError(strings.forms.validation.required);
      setIsLoading(false);
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError(strings.forms.validation.passwordMismatch);
      setIsLoading(false);
      return;
    }

    // Validate password strength for signup
    if (!isLogin) {
      const { isValid, failedRequirements } = validatePassword(password);
      if (!isValid) {
        setError(`Password must meet all requirements: ${failedRequirements.join(', ')}`);
        setIsLoading(false);
        return;
      }
      
      // Check if email is available
      if (emailAvailable === false) {
        setError('This email is already registered. Please sign in instead.');
        setIsLoading(false);
        return;
      }
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
      setError(strings.forms.validation.invalidEmail);
      setModalType('error');
      setShowErrorModal(true);
      return;
    }

    try {
      await resetPassword(email);
      // Show success modal instead of notification
      setError('Password reset email sent! Please check your inbox and spam folder.');
      setModalType('success');
      setShowErrorModal(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
      setModalType('error');
      setShowErrorModal(true);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      // The user will be automatically signed out and redirected
    } catch (err: any) {
      console.error('Delete account error:', err);
      setError(err.message || 'Failed to delete account. Please try again.');
      setModalType('error');
      setShowErrorModal(true);
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper to update avatar in Firestore
  async function handleAvatarSelect(img: string) {
    if (!user) return;
    setUpdatingAvatar(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { avatar: img });
      // The realtime listener in UserProfileContext will automatically update
      setShowAvatarModal(false);
    } catch (error) {
      setErrorMessage('Failed to update avatar.');
    } finally {
      setUpdatingAvatar(false);
    }
  }

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen bg-background">
        <SmartPageHeader title="Account" />

        {/* Main Content */}
        <div className="container mx-auto px-4">

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
                <div className="flex flex-col items-center md:flex-row md:items-center md:space-x-4 mb-6">
                  {/* User Avatar */}
                  <div className="relative mb-2 md:mb-0">
                    <UserAvatar size="lg" />
                    <button
                      className="absolute"
                      style={{
                        right: '-10px',
                        bottom: '-10px',
                        zIndex: 2,
                        fontSize: '1.1rem',
                        transform: 'scaleX(-1)',
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        margin: 0,
                        lineHeight: 1,
                        cursor: 'pointer',
                      }}
                      aria-label="Edit avatar"
                      onClick={() => setShowAvatarModal(true)}
                    >
                      <span role="img" aria-label="Edit">✏️</span>
                    </button>
                  </div>
                  <div className="text-center md:text-left">
                    <h2 className="text-xl font-semibold text-foreground">{user.displayName}</h2>
                    <p className="text-muted-foreground">{user.email}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">Account Status</span>
                    <span className="text-sm text-green-600 font-medium">Active</span>
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
                <div className="bg-gradient-to-r from-muted/50 to-blue-50 dark:from-muted/40 dark:to-blue-900/40 border border-border rounded-lg p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                      <span className="text-2xl">🛡️</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        Administrator Access
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Manage users, content, and system settings
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <SmartNavigationLink href="/admin"
                      className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
                     title={strings.admin.dashboard || "Admin Dashboard"}>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Admin Dashboard
                    </SmartNavigationLink>

                    <SmartNavigationLink href="/admin/users"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
                     title={strings.admin.dashboard || "Admin Dashboard"}>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                      User Management
                    </SmartNavigationLink>

                    <SmartNavigationLink href="/admin/mood-boards"
                      className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
                     title={strings.admin.dashboard || "Admin Dashboard"}>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                      Mood Boards
                    </SmartNavigationLink>
                  </div>

                  <div className="mt-4 p-4 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <svg className="w-5 h-5 text-blue-700 dark:text-blue-300 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.866-.833-2.5 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                          Admin Privileges Active
                        </p>
                        <p className="text-sm text-blue-800 dark:text-blue-200 mt-1 leading-relaxed">
                          You have full access to system administration features. Use these tools responsibly.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Detailed Statistics - Only for registered users */}
              {user && userType !== 'guest' && (
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <DetailedStats />
                </div>
              )}

              {/* Subscription Management */}
              {subLoading ? (
                <div className="bg-card border border-border rounded-lg p-6 flex items-center justify-center">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <SubscriptionPlans />
              )}

              {/* Subscription History */}
              {isPremium && <SubscriptionHistory />}

              {/* Account Actions */}
              <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  Sign Out
                </button>
                
                {/* Delete Account Button */}
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full px-4 py-3 text-white rounded-lg transition-colors font-medium"
                  style={{
                    backgroundColor: 'hsl(25, 95%, 53%)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'hsl(25, 95%, 48%)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'hsl(25, 95%, 53%)';
                  }}
                >
                  Delete Account
                </button>
              </div>
            </div>
          </main>
        </div>

        {/* Error Modal */}
        <AuthErrorModal
          isOpen={showErrorModal}
          error={error}
          type={modalType}
          onClose={() => setShowErrorModal(false)}
        />
        
        {/* Delete Account Modal */}
        <DeleteAccountModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteAccount}
          isDeleting={isDeleting}
        />

        {/* Avatar selection modal */}
        {showAvatarModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="bg-card rounded-lg p-6 max-w-lg w-full mx-2 relative">
              <button
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowAvatarModal(false)}
                aria-label="Close avatar picker"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-lg font-semibold mb-4 text-center">Choose your profile thumbnail</h3>
              <div className="grid grid-cols-4 gap-3 md:grid-cols-6">
                {THUMBNAIL_OPTIONS.map((img) => (
                  <button
                    key={img}
                    onClick={() => handleAvatarSelect(img)}
                    className={`border-2 rounded-lg p-1 transition-all ${profile?.avatar === img ? 'border-primary ring-2 ring-primary' : 'border-transparent hover:border-muted'} ${updatingAvatar ? 'opacity-50 pointer-events-none' : ''}`}
                    aria-label="Choose avatar"
                    disabled={updatingAvatar}
                  >
                    <img src={img} alt="avatar option" className="w-12 h-12 object-contain" />
                  </button>
                ))}
              </div>
              {updatingAvatar && <div className="mt-4 text-center text-sm text-muted-foreground">Updating...</div>}
            </div>
          </div>
        )}

        {/* Error Message Modal */}
        {errorMessage && (
          <ConfirmationDialog
            isOpen={!!errorMessage}
            title="Error"
            message={errorMessage}
            confirmText="OK"
            cancelText=""
            isDestructive={false}
            onConfirm={() => setErrorMessage(null)}
            onCancel={() => setErrorMessage(null)}
            loading={false}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SmartPageHeader title="Account" />

      {/* Main Content */}
      <div className="container mx-auto px-4">

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
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
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
                <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
              </div>
            </div>

            {/* Error Display */}
            {error && !showErrorModal && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

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
                    name="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={strings.forms.placeholders.name}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (!isLogin) {
                        checkEmail(e.target.value);
                      }
                    }}
                    placeholder={strings.forms.placeholders.email}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                      !isLogin && email && !checkingEmail && emailAvailable !== null
                        ? emailAvailable
                          ? 'border-success'
                          : 'border-destructive'
                        : 'border-border'
                    }`}
                    required
                  />
                  
                  {/* Email Status Indicator */}
                  {!isLogin && email && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {checkingEmail ? (
                        <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                      ) : emailAvailable !== null ? (
                        <svg
                          className={`w-5 h-5 ${emailAvailable ? 'text-success' : 'text-destructive'}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          {emailAvailable ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          )}
                        </svg>
                      ) : null}
                    </div>
                  )}
                </div>
                
                {/* Email Availability Message */}
                {!isLogin && email && !checkingEmail && emailAvailable === false && (
                  <p className="mt-1 text-sm text-destructive">
                    This email is already registered. Please sign in instead.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                  }}
                  placeholder={strings.forms.placeholders.password}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
                
                {/* Password Requirements for Signup */}
                {!isLogin && showPasswordRequirements && (
                  <div className="mt-3 space-y-2">
                    {/* Password Strength Indicator - Always visible */}
                    {password && (
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground">Password Strength</span>
                          <span className={`text-sm font-medium ${getPasswordStrength(password).color}`}>
                            {getPasswordStrength(password).strength.charAt(0).toUpperCase() + getPasswordStrength(password).strength.slice(1)}
                          </span>
                        </div>
                        <div className="w-full bg-background rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              getPasswordStrength(password).strength === 'weak' ? 'bg-destructive' :
                              getPasswordStrength(password).strength === 'medium' ? 'bg-warning' :
                              'bg-success'
                            }`}
                            style={{ width: `${getPasswordStrength(password).percentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Collapsible Requirements */}
                    <div className="bg-muted rounded-lg">
                      <button
                        type="button"
                        onClick={() => setExpandRequirements(!expandRequirements)}
                        className="w-full p-3 flex items-center justify-between text-sm hover:bg-muted/80 transition-colors rounded-lg"
                      >
                        <span className="font-medium text-foreground">
                          {expandRequirements ? 'Hide' : 'Show'} password requirements
                        </span>
                        <svg
                          className={`w-4 h-4 text-muted-foreground transition-transform ${expandRequirements ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {expandRequirements && (
                        <div className="px-3 pb-3">
                          <ul className="space-y-1">
                            {passwordRequirements.map((req, index) => {
                              const isMet = req.test(password);
                              return (
                                <li key={index} className="flex items-center gap-2">
                                  <svg
                                    className={`w-4 h-4 ${isMet ? 'text-success' : 'text-muted-foreground'}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    {isMet ? (
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    ) : (
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    )}
                                  </svg>
                                  <span className={`text-sm ${isMet ? 'text-success' : 'text-muted-foreground'}`}>
                                    {req.label}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {!isLogin && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={strings.forms.placeholders.confirmPassword}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                  
                  {/* Password Match Indicator */}
                  {confirmPassword && (
                    <div className="mt-2 flex items-center gap-2">
                      <svg
                        className={`w-4 h-4 ${password === confirmPassword ? 'text-success' : 'text-destructive'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        {password === confirmPassword ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        )}
                      </svg>
                      <span className={`text-sm ${password === confirmPassword ? 'text-success' : 'text-destructive'}`}>
                        {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || (!isLogin && emailAvailable === false)}
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
        type={modalType}
        onClose={() => setShowErrorModal(false)}
      />
    </div>
  );
}
