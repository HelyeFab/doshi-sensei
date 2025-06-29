/**
 * Firebase Admin SDK wrapper for Next.js + Netlify
 * 
 * This module provides a safe way to use Firebase Admin SDK in a serverless environment.
 * It handles the initialization complexities and prevents errors during build time.
 */

import { getFirebaseAdminSync } from './firebase-admin-safe';

// Create a proxy that delays access until runtime
// This prevents initialization during build time
const adminProxy = new Proxy({}, {
  get(target, prop) {
    const admin = getFirebaseAdminSync();
    return admin[prop as keyof typeof admin];
  },
  has(target, prop) {
    const admin = getFirebaseAdminSync();
    return prop in admin;
  }
});

// Export as default for backward compatibility
// API routes should use getFirebaseAdmin() from firebase-admin-safe for proper async initialization
export default adminProxy;