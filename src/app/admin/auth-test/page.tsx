'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { 
  sendEmailVerification,
  sendPasswordResetEmail,
  applyActionCode,
  verifyPasswordResetCode,
  confirmPasswordReset,
  checkActionCode
} from 'firebase/auth';

export default function AuthTestPage() {
  const { user, signUpWithEmail, signInWithEmail, logout } = useAuth();
  const [testEmail, setTestEmail] = useState('');
  const [testPassword, setTestPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [actionCode, setActionCode] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [emailVerificationStatus, setEmailVerificationStatus] = useState<'unverified' | 'sent' | 'verified'>('unverified');

  useEffect(() => {
    if (user) {
      setEmailVerificationStatus(user.emailVerified ? 'verified' : 'unverified');
    }
  }, [user]);

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    setLogs(prev => [...prev, `[${timestamp}] ${prefix} ${message}`]);
  };

  const clearLogs = () => setLogs([]);

  const handleCreateTestAccount = async () => {
    if (!testEmail || !testPassword) {
      addLog('Please provide test email and password', 'error');
      return;
    }

    setIsLoading(true);
    try {
      addLog(`Creating test account with email: ${testEmail}`);
      const newUser = await signUpWithEmail(testEmail, testPassword);
      
      if (newUser) {
        addLog(`Account created successfully. UID: ${newUser.uid}`, 'success');
        addLog(`Email verified status: ${newUser.emailVerified ? 'Verified' : 'Not Verified'}`);
      }
    } catch (error: any) {
      addLog(`Failed to create account: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!testEmail || !testPassword) {
      addLog('Please provide email and password', 'error');
      return;
    }

    setIsLoading(true);
    try {
      addLog(`Signing in with email: ${testEmail}`);
      const result = await signInWithEmail(testEmail, testPassword);
      addLog(`Signed in successfully. UID: ${result.user.uid}`, 'success');
      addLog(`Email verified: ${result.user.emailVerified ? 'Yes' : 'No'}`);
    } catch (error: any) {
      addLog(`Sign in failed: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendVerificationEmail = async () => {
    if (!user) {
      addLog('No user is currently signed in', 'error');
      return;
    }

    if (user.emailVerified) {
      addLog('Email is already verified', 'info');
      return;
    }

    setIsLoading(true);
    try {
      addLog(`Sending verification email to: ${user.email}`);
      await sendEmailVerification(user, {
        url: `${window.location.origin}/account`, // Redirect URL after verification
        handleCodeInApp: false
      });
      addLog('Verification email sent successfully! Check your inbox.', 'success');
      addLog('Note: Email may take a few minutes to arrive. Check spam folder if needed.');
      setEmailVerificationStatus('sent');
    } catch (error: any) {
      if (error.code === 'auth/too-many-requests') {
        addLog('Too many requests. Please wait before sending another email.', 'error');
      } else {
        addLog(`Failed to send verification email: ${error.message}`, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckVerificationStatus = async () => {
    if (!user) {
      addLog('No user is currently signed in', 'error');
      return;
    }

    setIsLoading(true);
    try {
      addLog('Checking email verification status...');
      await user.reload(); // Reload user to get latest verification status
      const updatedVerified = user.emailVerified;
      
      addLog(`Email verified: ${updatedVerified ? 'Yes ✅' : 'No ❌'}`);
      setEmailVerificationStatus(updatedVerified ? 'verified' : emailVerificationStatus);
      
      if (updatedVerified) {
        addLog('Email has been successfully verified!', 'success');
      } else {
        addLog('Email is not yet verified. Please check your email and click the verification link.');
      }
    } catch (error: any) {
      addLog(`Failed to check verification status: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPasswordResetEmail = async () => {
    if (!testEmail) {
      addLog('Please provide an email address', 'error');
      return;
    }

    setIsLoading(true);
    try {
      addLog(`Sending password reset email to: ${testEmail}`);
      await sendPasswordResetEmail(auth!, testEmail, {
        url: `${window.location.origin}/login`, // Redirect URL after reset
        handleCodeInApp: false
      });
      addLog('Password reset email sent successfully!', 'success');
      addLog('Check your inbox for the reset link. It may take a few minutes to arrive.');
      addLog('The link will expire in 1 hour.');
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        addLog('No user found with this email address', 'error');
      } else if (error.code === 'auth/too-many-requests') {
        addLog('Too many requests. Please wait before sending another email.', 'error');
      } else {
        addLog(`Failed to send reset email: ${error.message}`, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyResetCode = async () => {
    if (!actionCode) {
      addLog('Please provide an action code (from the reset email URL)', 'error');
      return;
    }

    setIsLoading(true);
    try {
      addLog('Verifying password reset code...');
      const email = await verifyPasswordResetCode(auth!, actionCode);
      addLog(`Reset code is valid for email: ${email}`, 'success');
      addLog('You can now reset the password using this code.');
    } catch (error: any) {
      if (error.code === 'auth/expired-action-code') {
        addLog('Reset code has expired. Please request a new one.', 'error');
      } else if (error.code === 'auth/invalid-action-code') {
        addLog('Invalid reset code. Please check the code and try again.', 'error');
      } else {
        addLog(`Failed to verify reset code: ${error.message}`, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!actionCode || !newPassword) {
      addLog('Please provide both action code and new password', 'error');
      return;
    }

    setIsLoading(true);
    try {
      addLog('Resetting password...');
      await confirmPasswordReset(auth!, actionCode, newPassword);
      addLog('Password reset successfully!', 'success');
      addLog('You can now sign in with your new password.');
      setActionCode('');
      setNewPassword('');
    } catch (error: any) {
      if (error.code === 'auth/expired-action-code') {
        addLog('Reset code has expired. Please request a new one.', 'error');
      } else if (error.code === 'auth/invalid-action-code') {
        addLog('Invalid reset code. Please check the code and try again.', 'error');
      } else if (error.code === 'auth/weak-password') {
        addLog('Password is too weak. Please use at least 6 characters.', 'error');
      } else {
        addLog(`Failed to reset password: ${error.message}`, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyActionCode = async () => {
    if (!actionCode) {
      addLog('Please provide an action code', 'error');
      return;
    }

    setIsLoading(true);
    try {
      addLog('Checking action code type...');
      const info = await checkActionCode(auth!, actionCode);
      
      addLog(`Action code type: ${info.operation}`);
      addLog(`Email: ${info.data.email}`);

      if (info.operation === 'VERIFY_EMAIL') {
        addLog('This is an email verification code. Applying...');
        await applyActionCode(auth!, actionCode);
        addLog('Email verified successfully!', 'success');
        setEmailVerificationStatus('verified');
        if (user) {
          await user.reload();
        }
      } else if (info.operation === 'PASSWORD_RESET') {
        addLog('This is a password reset code. Use the password reset section to complete.');
      } else {
        addLog(`Unknown operation: ${info.operation}`);
      }
    } catch (error: any) {
      if (error.code === 'auth/expired-action-code') {
        addLog('Action code has expired. Please request a new one.', 'error');
      } else if (error.code === 'auth/invalid-action-code') {
        addLog('Invalid action code. Please check the code and try again.', 'error');
      } else {
        addLog(`Failed to apply action code: ${error.message}`, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await logout();
      addLog('Signed out successfully', 'success');
      setEmailVerificationStatus('unverified');
    } catch (error: any) {
      addLog(`Sign out failed: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Auth Testing Dashboard</h1>
      
      {/* Current User Status */}
      <div className="bg-card rounded-lg p-6 mb-6 border border-border">
        <h2 className="text-xl font-semibold mb-4">Current Status</h2>
        {user ? (
          <div className="space-y-2">
            <p><strong>Signed in as:</strong> {user.email}</p>
            <p><strong>UID:</strong> {user.uid}</p>
            <p><strong>Display Name:</strong> {user.displayName || 'Not set'}</p>
            <p className="flex items-center gap-2">
              <strong>Email Verified:</strong>
              {user.emailVerified ? (
                <span className="text-green-600">✅ Yes</span>
              ) : (
                <span className="text-red-600">❌ No</span>
              )}
            </p>
            <button
              onClick={handleSignOut}
              disabled={isLoading}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <p className="text-muted">Not signed in</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Creation & Sign In */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <h2 className="text-xl font-semibold mb-4">Account Management</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Test Email</label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded bg-background"
                placeholder="test@example.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Test Password</label>
              <input
                type="password"
                value={testPassword}
                onChange={(e) => setTestPassword(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded bg-background"
                placeholder="At least 6 characters"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCreateTestAccount}
                disabled={isLoading || !!user}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50"
              >
                Create Account
              </button>
              <button
                onClick={handleSignIn}
                disabled={isLoading || !!user}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>

        {/* Email Verification */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <h2 className="text-xl font-semibold mb-4">Email Verification</h2>
          
          <div className="space-y-4">
            <div className="p-3 bg-muted/20 rounded">
              <p className="text-sm">Status: 
                {emailVerificationStatus === 'verified' && <span className="ml-2 text-green-600 font-semibold">✅ Verified</span>}
                {emailVerificationStatus === 'sent' && <span className="ml-2 text-yellow-600 font-semibold">📧 Email Sent</span>}
                {emailVerificationStatus === 'unverified' && <span className="ml-2 text-red-600 font-semibold">❌ Not Verified</span>}
              </p>
            </div>

            <button
              onClick={handleSendVerificationEmail}
              disabled={isLoading || !user || user.emailVerified}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50"
            >
              Send Verification Email
            </button>

            <button
              onClick={handleCheckVerificationStatus}
              disabled={isLoading || !user}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:opacity-90 disabled:opacity-50"
            >
              Check Verification Status
            </button>

            <div className="pt-4 border-t border-border">
              <label className="block text-sm font-medium mb-1">Manual Verification Code</label>
              <input
                type="text"
                value={actionCode}
                onChange={(e) => setActionCode(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded bg-background mb-2"
                placeholder="Paste oobCode from email link"
              />
              <button
                onClick={handleApplyActionCode}
                disabled={isLoading || !actionCode}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:opacity-90 disabled:opacity-50"
              >
                Apply Action Code
              </button>
            </div>
          </div>
        </div>

        {/* Password Reset */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <h2 className="text-xl font-semibold mb-4">Password Reset</h2>
          
          <div className="space-y-4">
            <button
              onClick={handleSendPasswordResetEmail}
              disabled={isLoading || !testEmail}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50"
            >
              Send Password Reset Email
            </button>

            <div className="pt-4 border-t border-border">
              <h3 className="font-medium mb-2">Complete Password Reset</h3>
              
              <div className="space-y-2">
                <input
                  type="text"
                  value={actionCode}
                  onChange={(e) => setActionCode(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded bg-background"
                  placeholder="Reset code (oobCode from email)"
                />
                
                <button
                  onClick={handleVerifyResetCode}
                  disabled={isLoading || !actionCode}
                  className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded hover:opacity-90 disabled:opacity-50"
                >
                  Verify Reset Code
                </button>

                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded bg-background"
                  placeholder="New password"
                />
                
                <button
                  onClick={handleResetPassword}
                  disabled={isLoading || !actionCode || !newPassword}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50"
                >
                  Reset Password
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Test Instructions */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <h2 className="text-xl font-semibold mb-4">Testing Instructions</h2>
          
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold mb-1 text-foreground">Email Verification Flow:</h3>
              <ol className="list-decimal list-inside space-y-1 text-foreground/70">
                <li>Create a new account or sign in</li>
                <li>Click "Send Verification Email"</li>
                <li>Check your email inbox (may take 1-2 minutes)</li>
                <li>Click the verification link in the email</li>
                <li>Return here and click "Check Verification Status"</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold mb-1 text-foreground">Password Reset Flow:</h3>
              <ol className="list-decimal list-inside space-y-1 text-foreground/70">
                <li>Enter an email address (can be signed out)</li>
                <li>Click "Send Password Reset Email"</li>
                <li>Check your email for the reset link</li>
                <li>Copy the oobCode parameter from the URL</li>
                <li>Paste it in the reset code field</li>
                <li>Verify the code, then enter new password</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold mb-1 text-foreground">Manual Code Entry:</h3>
              <p className="text-foreground/70">
                If email links don't work, you can extract the "oobCode" parameter from the email link URL and paste it in the action code field to manually verify or reset.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Logs */}
      <div className="mt-6 bg-card rounded-lg p-6 border border-border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Activity Logs</h2>
          <button
            onClick={clearLogs}
            className="px-3 py-1 text-sm bg-muted text-muted-foreground rounded hover:bg-muted/80"
          >
            Clear Logs
          </button>
        </div>
        
        <div className="bg-background rounded p-4 h-64 overflow-y-auto font-mono text-sm">
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <div key={index} className="py-1">
                {log}
              </div>
            ))
          ) : (
            <p className="text-foreground/50">No activity yet. Start testing to see logs here.</p>
          )}
        </div>
      </div>
    </div>
  );
}