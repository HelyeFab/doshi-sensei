'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import DoshiMascot from '@/components/DoshiMascot';
import { useToast } from '@/hooks/useToast';
import { 
  Mail, 
  ArrowRight, 
  Shield, 
  CheckCircle, 
  Info,
  Sparkles,
  Lock,
  Globe,
  Users,
  Star,
  Home
} from 'lucide-react';

export default function LoginPage() {
  const { user, sendMagicLink, signInWithGoogle, isEmailVerified, sendVerificationEmail } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [showVerificationReminder, setShowVerificationReminder] = useState(false);

  // Check if user is logged in
  useEffect(() => {
    if (user) {
      // Check if email is verified
      if (!isEmailVerified()) {
        setShowVerificationReminder(true);
      } else {
        // Redirect to home if logged in and verified
        router.push('/');
      }
    }
  }, [user, router, isEmailVerified]);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setIsLoading(true);

    try {
      const result = await sendMagicLink(email);
      
      if (result.success) {
        setMagicLinkSent(true);
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error('Failed to send magic link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    
    try {
      const result = await signInWithGoogle();
      
      if (result.success) {
        toast.success('Welcome back!');
        router.push('/');
      } else {
        toast.error(result.message || 'Failed to sign in with Google');
      }
    } catch (error: any) {
      toast.error('Failed to sign in with Google');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSendVerification = async () => {
    try {
      const result = await sendVerificationEmail();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to send verification email');
    }
  };

  // If magic link was sent, show confirmation
  if (magicLinkSent && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <div className="bg-card rounded-2xl shadow-2xl border border-border p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6"
            >
              <Mail className="w-10 h-10 text-green-600" />
            </motion.div>
            
            <h2 className="text-2xl font-bold text-foreground mb-3">
              Check Your Email!
            </h2>
            
            <p className="text-muted-foreground mb-6">
              We've sent a secure sign-in link to <strong>{email}</strong>
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-left text-sm text-blue-800">
                  <p className="font-medium mb-1">Next Steps:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Open your email inbox</li>
                    <li>Click the magic link we sent you</li>
                    <li>You'll be automatically signed in</li>
                  </ol>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setMagicLinkSent(false);
                  setEmail('');
                }}
                className="text-primary hover:underline text-sm"
              >
                Use a different email
              </button>
              
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
              >
                <Home className="w-4 h-4" />
                Back to Homepage
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // If user is logged in but not verified
  if (user && showVerificationReminder) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <div className="bg-card rounded-2xl shadow-2xl border border-border p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
                <Shield className="w-8 h-8 text-yellow-600" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Verify Your Email
              </h2>
              <p className="text-muted-foreground">
                Please verify your email address to access all features
              </p>
            </div>
            
            <button
              onClick={handleSendVerification}
              className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors mb-3"
            >
              Send Verification Email
            </button>
            
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 bg-secondary text-secondary-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors"
            >
              Continue to App
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute top-20 left-10 text-8xl text-primary/10"
        >
          道
        </motion.div>
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 12, repeat: Infinity, delay: 2 }}
          className="absolute bottom-20 right-20 text-8xl text-accent/10"
        >
          師
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-accent p-8 text-white text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-block mb-4"
            >
              <DoshiMascot
                variant="animated"
                size="medium"
                className="drop-shadow-xl"
              />
            </motion.div>
            <h1 className="text-2xl font-bold mb-2">
              Welcome to Dōshi Sensei
            </h1>
            <p className="text-white/90 text-sm">
              Sign in securely with no password needed
            </p>
          </div>

          {/* Security Features */}
          <div className="px-8 pt-6 pb-4">
            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>Secure</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                <span>GDPR Compliant</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span>No Password</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="px-8 pb-8">
            {/* Magic Link Sign In */}
            <form onSubmit={handleMagicLink} className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary pr-12"
                  placeholder="you@example.com"
                  required
                  disabled={isLoading || isGoogleLoading}
                />
                <Mail className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              </div>
              
              <button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="w-full mt-4 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending...</span>
                  </div>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Send Magic Link</span>
                  </>
                )}
              </button>
            </form>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading || isGoogleLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-background border-2 border-border rounded-xl hover:bg-muted transition-all duration-200 disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {isGoogleLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                  <span className="font-medium">Redirecting...</span>
                </div>
              ) : (
                <span className="font-medium">Sign in with Google</span>
              )}
            </button>

            {/* Benefits */}
            <div className="mt-8 space-y-3">
              <h3 className="text-sm font-medium text-foreground mb-3">Why Magic Links?</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    No passwords to remember or manage
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Enhanced security with email verification
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Quick and easy sign-in experience
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Home Link */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}