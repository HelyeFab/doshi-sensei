/**
 * Firebase Admin SDK wrapper for Next.js + Netlify
 * 
 * This module provides a safe way to use Firebase Admin SDK in a serverless environment.
 * It handles the initialization complexities and prevents errors during build time.
 */

import { getFirebaseAdminSync } from './firebase-admin-safe';

// Export the synchronous version as default for backward compatibility
// API routes should use getFirebaseAdmin() from firebase-admin-safe for proper async initialization
export default getFirebaseAdminSync();