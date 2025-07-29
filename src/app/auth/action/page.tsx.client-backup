'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { applyActionCode, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { APP_CONFIG } from '@/config/app';

function AuthActionHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!mode || !oobCode) {
      setStatus('error');
      setMessage('Invalid link');
      return;
    }

    const handleAction = async () => {
      try {
        switch (mode) {
          case 'verifyEmail':
            await applyActionCode(auth, oobCode);
            setStatus('success');
            setMessage(`Your email has been verified! Welcome to ${APP_CONFIG.name}!`);
            setTimeout(() => router.push('/'), 3000);
            break;
            
          case 'resetPassword':
            // Redirect to reset password page with the code
            router.push(`/reset-password?mode=resetPassword&oobCode=${oobCode}`);
            break;
            
          default:
            setStatus('error');
            setMessage('Unknown action');
        }
      } catch (error: any) {
        setStatus('error');
        if (error.code === 'auth/invalid-action-code') {
          setMessage('This link has expired or is invalid.');
        } else {
          setMessage('An error occurred. Please try again.');
        }
      }
    };

    handleAction();
  }, [mode, oobCode, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Processing your request...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
          <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
            status === 'success' ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {status === 'success' ? (
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            {status === 'success' ? 'Success!' : 'Error'}
          </h1>
          
          <p className="text-gray-600 mb-6">{message}</p>

          {status === 'success' && (
            <p className="text-sm text-gray-500">
              Redirecting to {APP_CONFIG.name} homepage...
            </p>
          )}

          {status === 'error' && (
            <a
              href="/"
              className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Go to Homepage
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthActionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    }>
      <AuthActionHandler />
    </Suspense>
  );
}