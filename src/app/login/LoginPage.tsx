'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import AuthErrorModal from '@/components/AuthErrorModal';
import { useStrings } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { validatePassword, passwordRequirements, getPasswordStrength } from '@/utils/passwordValidation';
import { checkEmailAvailability, debounce } from '@/utils/emailValidation';
import { getAuthErrorMessage } from '@/utils/authErrorMessages';

export default function LoginPage() {
  const { user, loading: authLoading, signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword } = useAuth();
  const { showNotification } = useNotification();
  const strings = useStrings();
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalType, setModalType] = useState<'error' | 'success'>('error');
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const [expandRequirements, setExpandRequirements] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  
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

  // Redirect based on auth state
  useEffect(() => {
    if (user && !authLoading) {
      // Check if email is verified
      if (!user.emailVerified) {
        router.push('/verify-email');
      } else {
        router.push('/');
      }
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted');
    setError('');
    setIsLoading(true);

    // Basic validation
    if (!email || !password) {
      console.log('Missing email or password');
      setError(strings.forms.validation.required);
      setIsLoading(false);
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      console.log('Passwords do not match');
      setError(strings.forms.validation.passwordMismatch);
      setIsLoading(false);
      return;
    }

    // Validate password strength for signup
    if (!isLogin) {
      const { isValid, failedRequirements } = validatePassword(password);
      console.log('Password validation:', { isValid, failedRequirements, password });
      if (!isValid) {
        console.log('Failed requirements:', failedRequirements);
        setError(`Password must meet all requirements: ${failedRequirements.join(', ')}`);
        setIsLoading(false);
        return;
      }
      
      // Check if email is available (only block if explicitly false)
      console.log('Email available:', emailAvailable);
      if (emailAvailable === false) {
        setError('This email is already registered. Please sign in instead.');
        setIsLoading(false);
        return;
      }
      
      // If email check is still pending, proceed anyway
      if (emailAvailable === null && email) {
        console.log('Email availability not checked yet, proceeding with signup');
      }
    }

    try {
      console.log('Attempting authentication...', { isLogin, email });
      if (isLogin) {
        await signInWithEmail(email, password);
        console.log('Sign in successful');
        
        // Clear form
        setEmail('');
        setPassword('');
        
        // After sign in, the auth state will update and redirect will happen
        // through the useEffect that watches for auth changes
      } else {
        console.log('Calling signUpWithEmail with:', { email, displayName });
        const user = await signUpWithEmail(email, password, displayName);
        console.log('Sign up successful');
        
        // Clear form
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setDisplayName('');
        
        // Show success modal and redirect to email verification page
        if (user) {
          setError('Account created successfully! Please check your email to verify your account.');
          setModalType('success');
          setShowErrorModal(true);
          
          // Delay redirect to allow user to read the message
          setTimeout(() => {
            router.push('/verify-email');
          }, 2000);
        }
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      // Use custom error message based on error code
      const errorMessage = getAuthErrorMessage(err.code || 'default');
      setError(errorMessage);
      // Don't show modal for inline errors
      setShowErrorModal(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);

    try {
      await signInWithGoogle();
      // Redirect will happen via useEffect when auth state changes
    } catch (err: any) {
      console.error('Google sign in error:', err);
      const errorMessage = getAuthErrorMessage(err.code || 'default');
      setError(errorMessage);
      setShowErrorModal(false);
    } finally {
      setIsLoading(false);
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
      console.error('Password reset error:', err);
      const errorMessage = getAuthErrorMessage(err.code || 'default');
      setError(errorMessage);
      setModalType('error');
      setShowErrorModal(true);
    }
  };

  if (authLoading || user) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      {/* Main Content */}
      <div className="container mx-auto px-4">
        <main className="max-w-md mx-auto">
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
                <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
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
                          ? 'border-green-500'
                          : 'border-red-500'
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
                          className={`w-5 h-5 ${emailAvailable ? 'text-primary' : 'text-destructive'}`}
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
                              'bg-primary'
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
                                    className={`w-4 h-4 ${isMet ? 'text-primary' : 'text-muted-foreground'}`}
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
                                  <span className={`text-sm ${isMet ? 'text-primary' : 'text-muted-foreground'}`}>
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
                        className={`w-4 h-4 ${password === confirmPassword ? 'text-primary' : 'text-destructive'}`}
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
                      <span className={`text-sm ${password === confirmPassword ? 'text-primary' : 'text-destructive'}`}>
                        {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || (!isLogin && emailAvailable === false) || (!isLogin && checkingEmail)}
                className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                onClick={() => console.log('Button clicked, isLoading:', isLoading, 'emailAvailable:', emailAvailable, 'checkingEmail:', checkingEmail)}
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

            {/* Back to Home Link */}
            <div className="text-center mt-6 pt-6 border-t border-border">
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                ← Back to Home
              </Link>
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
    </div>
  );
}