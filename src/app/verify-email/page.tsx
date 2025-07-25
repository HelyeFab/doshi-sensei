'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { useNotification } from '@/contexts/NotificationContext';
import { sendCustomEmailVerification } from '@/lib/email/customEmailVerification';

export default function VerifyEmailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { showNotification } = useNotification();
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    // Redirect if user is already verified or not logged in
    if (!user) {
      router.push('/login');
    } else if (user.emailVerified) {
      router.push('/');
    }
  }, [user, router]);

  useEffect(() => {
    // Cooldown timer
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendEmail = async () => {
    if (!user || resendCooldown > 0) return;

    setIsResending(true);
    try {
      const result = await sendCustomEmailVerification(user);
      
      if (result.success) {
        showNotification({
          title: 'Verification Email Sent',
          message: 'Please check your inbox and spam folder.',
          type: 'success'
        });
        setResendCooldown(60); // 60 second cooldown
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('Error resending verification email:', error);
      showNotification({
        title: 'Error',
        message: error.message || 'Failed to send verification email',
        type: 'error'
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleRefresh = () => {
    // Reload to check if user has verified their email
    window.location.reload();
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
          {/* Email Icon */}
          <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Verify Your Email
          </h1>
          
          <p className="text-gray-600 mb-2">
            We've sent a verification email to:
          </p>
          
          <p className="font-medium text-gray-900 mb-6">
            {user.email}
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              Please check your inbox and click the verification link to complete your registration. 
              Don't forget to check your spam folder!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleResendEmail}
              disabled={isResending || resendCooldown > 0}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isResending ? (
                <span>Sending...</span>
              ) : resendCooldown > 0 ? (
                <span>Resend in {resendCooldown}s</span>
              ) : (
                <span>Resend Verification Email</span>
              )}
            </button>

            <button
              onClick={handleRefresh}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              I've Verified My Email
            </button>
          </div>

          {/* Additional Options */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Wrong email address?{' '}
              <button
                onClick={() => {
                  auth.signOut();
                  router.push('/login');
                }}
                className="text-primary hover:text-primary/80 transition-colors font-medium"
              >
                Sign out and try again
              </button>
            </div>
          </div>

          {/* Help Text */}
          <div className="mt-6 text-xs text-gray-500">
            <p>
              Having trouble? Contact support at support@doshisensei.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}