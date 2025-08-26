'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { verifyMagicLink } = useAuth();
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  
  useEffect(() => {
    const verifyLink = async () => {
      const token = searchParams.get('token');
      const email = searchParams.get('email');
      const returnUrl = searchParams.get('returnUrl');
      
      if (!token || !email) {
        setStatus('error');
        setErrorMessage('Invalid verification link');
        return;
      }
      
      try {
        const result = await verifyMagicLink(
          decodeURIComponent(email),
          token,
          window.location.href
        );
        
        if (result.success) {
          setStatus('success');
          setTimeout(() => {
            router.push(returnUrl ? decodeURIComponent(returnUrl) : '/');
          }, 2000);
        } else {
          setStatus('error');
          setErrorMessage(result.message || 'Verification failed');
        }
      } catch (error) {
        setStatus('error');
        setErrorMessage('An error occurred during verification');
      }
    };
    
    verifyLink();
  }, [searchParams, verifyMagicLink, router]);
  
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
                You've been signed in successfully. Redirecting...
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
                Verification Failed
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

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}