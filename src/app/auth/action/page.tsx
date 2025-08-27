'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';

function AuthActionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  
  useEffect(() => {
    const handleEmailLinkSignIn = async () => {
      try {
        // Check if this is a sign-in with email link
        if (!isSignInWithEmailLink(auth, window.location.href)) {
          setStatus('error');
          setErrorMessage('Invalid authentication link');
          return;
        }

        // Get email from localStorage (stored when magic link was sent)
        let email = window.localStorage.getItem('magicLinkEmail');
        
        // If no email in localStorage, check URL params
        if (!email) {
          // Try to extract email from continueUrl parameter
          const continueUrl = searchParams.get('continueUrl');
          if (continueUrl) {
            const urlParams = new URLSearchParams(continueUrl.split('?')[1]);
            const encodedEmail = urlParams.get('email');
            if (encodedEmail) {
              email = decodeURIComponent(encodedEmail);
            }
          }
        }
        
        // If still no email, prompt user
        if (!email) {
          email = window.prompt('Please provide your email for confirmation');
        }
        
        if (!email) {
          setStatus('error');
          setErrorMessage('Email is required to complete sign-in');
          return;
        }

        // Sign in with the email link
        const result = await signInWithEmailLink(auth, email, window.location.href);
        
        if (result.user) {
          setStatus('success');
          
          // Clear stored email
          window.localStorage.removeItem('magicLinkEmail');
          
          // Redirect after a short delay
          setTimeout(() => {
            router.push('/');
          }, 2000);
        } else {
          setStatus('error');
          setErrorMessage('Sign-in failed. Please try again.');
        }
      } catch (error: any) {
        console.error('Email link sign-in error:', error);
        setStatus('error');
        
        // Provide user-friendly error messages
        if (error.code === 'auth/invalid-action-code') {
          setErrorMessage('This link has expired or has already been used. Please request a new one.');
        } else if (error.code === 'auth/invalid-email') {
          setErrorMessage('The email address is invalid.');
        } else if (error.code === 'auth/user-disabled') {
          setErrorMessage('This account has been disabled.');
        } else {
          setErrorMessage(error.message || 'An error occurred during sign-in');
        }
      }
    };

    // If user is already signed in, redirect home
    if (user) {
      router.push('/');
      return;
    }

    handleEmailLinkSignIn();
  }, [searchParams, router, user]);
  
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        <div className="bg-card rounded-2xl shadow-2xl border border-border p-8 text-center">
          {status === 'verifying' && (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6"
              >
                <Loader2 className="w-10 h-10 text-blue-600" />
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                Verifying Your Magic Link
              </h2>
              <p className="text-muted-foreground">
                Please wait while we sign you in securely...
              </p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" }}
                className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6"
              >
                <CheckCircle className="w-10 h-10 text-green-600" />
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                Success!
              </h2>
              <p className="text-muted-foreground">
                You've been signed in successfully. Redirecting to your dashboard...
              </p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" }}
                className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6"
              >
                <XCircle className="w-10 h-10 text-red-600" />
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                Authentication Failed
              </h2>
              <p className="text-muted-foreground mb-6">
                {errorMessage}
              </p>
              <button
                onClick={() => router.push('/login')}
                className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
              >
                Back to Login
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function AuthActionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <AuthActionContent />
    </Suspense>
  );
}