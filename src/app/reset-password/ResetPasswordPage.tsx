'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useNotification } from '@/contexts/NotificationContext';
import { validatePassword, getPasswordStrength, passwordRequirements } from '@/utils/passwordValidation';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showNotification } = useNotification();
  
  const oobCode = searchParams.get('oobCode');
  const mode = searchParams.get('mode');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [isValidCode, setIsValidCode] = useState<boolean | null>(null);
  const [showRequirements, setShowRequirements] = useState(false);

  // Verify the reset code when component mounts
  useEffect(() => {
    const verifyCode = async () => {
      if (!oobCode || mode !== 'resetPassword') {
        setError('Invalid password reset link');
        setIsValidCode(false);
        return;
      }

      try {
        const email = await verifyPasswordResetCode(auth, oobCode);
        setEmail(email);
        setIsValidCode(true);
      } catch (error: any) {
        console.error('Invalid reset code:', error);
        setError('This password reset link is invalid or has expired.');
        setIsValidCode(false);
      }
    };

    verifyCode();
  }, [oobCode, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    const { isValid, failedRequirements } = validatePassword(password);
    if (!isValid) {
      setError(`Password must meet all requirements: ${failedRequirements.join(', ')}`);
      return;
    }

    if (!oobCode) {
      setError('Invalid password reset link');
      return;
    }

    setIsLoading(true);

    try {
      await confirmPasswordReset(auth, oobCode, password);
      
      showNotification({
        title: 'Password Reset Successful',
        message: 'Your password has been reset. You can now sign in with your new password.',
        type: 'success'
      });
      
      // Redirect to login page
      router.push('/login');
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      // Handle specific error codes
      if (error.code === 'auth/expired-action-code') {
        setError('This password reset link has expired. Please request a new one.');
      } else if (error.code === 'auth/invalid-action-code') {
        setError('This password reset link is invalid. Please request a new one.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak. Please choose a stronger password.');
      } else {
        setError(error.message || 'Failed to reset password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while verifying code
  if (isValidCode === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Show error if code is invalid
  if (isValidCode === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
            <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Invalid Reset Link
            </h1>
            
            <p className="text-gray-600 mb-6">
              {error || 'This password reset link is invalid or has expired.'}
            </p>
            
            <Link
              href="/login"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">🔐</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Reset Your Password
            </h1>
            <p className="text-gray-600">
              Enter your new password for {email}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
                minLength={8}
              />
              
              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-3 space-y-2">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">Password Strength</span>
                      <span className={`text-sm font-medium ${getPasswordStrength(password).color}`}>
                        {getPasswordStrength(password).strength.charAt(0).toUpperCase() + getPasswordStrength(password).strength.slice(1)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          getPasswordStrength(password).strength === 'weak' ? 'bg-red-500' :
                          getPasswordStrength(password).strength === 'medium' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${getPasswordStrength(password).percentage}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Password Requirements */}
                  <button
                    type="button"
                    onClick={() => setShowRequirements(!showRequirements)}
                    className="w-full p-2 text-sm text-gray-600 hover:text-gray-800 transition-colors flex items-center justify-between"
                  >
                    <span>{showRequirements ? 'Hide' : 'Show'} requirements</span>
                    <svg
                      className={`w-4 h-4 transition-transform ${showRequirements ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showRequirements && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <ul className="space-y-1">
                        {passwordRequirements.map((req, index) => {
                          const isMet = req.test(password);
                          return (
                            <li key={index} className="flex items-center gap-2">
                              <svg
                                className={`w-4 h-4 ${isMet ? 'text-green-500' : 'text-gray-400'}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                {isMet ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                ) : (
                                  <circle cx="12" cy="12" r="10" strokeWidth={2} />
                                )}
                              </svg>
                              <span className={`text-sm ${isMet ? 'text-green-700' : 'text-gray-600'}`}>
                                {req.label}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
              
              {/* Password Match Indicator */}
              {confirmPassword && (
                <div className="mt-2 flex items-center gap-2">
                  <svg
                    className={`w-4 h-4 ${password === confirmPassword ? 'text-green-500' : 'text-red-500'}`}
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
                  <span className={`text-sm ${password === confirmPassword ? 'text-green-600' : 'text-red-600'}`}>
                    {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !password || !confirmPassword}
              className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Resetting Password...</span>
                </div>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}