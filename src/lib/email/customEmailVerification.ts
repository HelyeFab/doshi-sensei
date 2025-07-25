import { auth } from '@/lib/firebase';
import { sendEmailVerification, ActionCodeSettings } from 'firebase/auth';

/**
 * Send a custom email verification with better formatting
 * This configures the email to ensure links are clickable
 */
export async function sendCustomEmailVerification(user: any) {
  // Configure action code settings
  const actionCodeSettings: ActionCodeSettings = {
    // URL to redirect to after verification
    url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://doshisensei.com'}/login?verified=true`,
    // This must be true for email verification
    handleCodeInApp: false,
  };

  try {
    // Send verification email with custom settings
    await sendEmailVerification(user, actionCodeSettings);
    
    console.log('Verification email sent successfully');
    return { success: true };
  } catch (error: any) {
    console.error('Error sending verification email:', error);
    
    // Handle specific errors
    if (error.code === 'auth/too-many-requests') {
      return { 
        success: false, 
        error: 'Too many requests. Please try again later.' 
      };
    }
    
    return { 
      success: false, 
      error: error.message || 'Failed to send verification email' 
    };
  }
}

/**
 * Instructions for Firebase Console Email Template Customization
 * 
 * 1. Go to Firebase Console > Authentication > Templates
 * 2. Select "Email address verification" 
 * 3. Click "Edit template"
 * 4. Customize:
 * 
 * Subject: Welcome to Doshi Sensei - Please Verify Your Email
 * 
 * Message:
 * Hello %DISPLAY_NAME%,
 * 
 * Welcome to Doshi Sensei! 🎌
 * 
 * Please verify your email address by clicking the link below:
 * 
 * %LINK%
 * 
 * If you didn't create an account with Doshi Sensei, you can safely ignore this email.
 * 
 * Happy learning!
 * The Doshi Sensei Team
 * 
 * ---
 * This is an automated message. Please do not reply to this email.
 * Need help? Contact us at support@doshisensei.com
 * 
 * 5. Make sure "Action URL" is set to your domain
 * 6. Save the template
 */