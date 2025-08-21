/**
 * Server-side Firebase Function caller
 * Uses direct HTTPS calls to Firebase Functions
 * No Firebase Admin SDK needed!
 */

const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'doshi-sensei';
const FIREBASE_REGION = 'us-central1'; // Default region for Firebase Functions

interface FirebaseFunctionResponse<T = any> {
  result?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

/**
 * Call a Firebase Cloud Function from server-side code
 * @param functionName The name of the function to call
 * @param data The data to send to the function
 * @param idToken Optional ID token for authenticated calls
 * @returns The response from the function
 */
export async function callFirebaseFunction<T = any, R = any>(
  functionName: string,
  data?: T,
  idToken?: string
): Promise<R> {
  const url = `https://${FIREBASE_REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net/${functionName}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ data }),
    });

    const result = await response.json() as FirebaseFunctionResponse<R>;

    if (!response.ok || result.error) {
      throw new Error(result.error?.message || `Function ${functionName} failed`);
    }

    return result.result as R;
  } catch (error: any) {
    console.error(`Error calling Firebase Function ${functionName}:`, error);
    throw new Error(error.message || 'Failed to call Firebase function');
  }
}

// Typed function calls for server-side use
export const serverFirebaseFunctions = {
  // Core operations
  cancelSubscription: (data: any, idToken?: string) => 
    callFirebaseFunction('cancelSubscription', data, idToken),
  deleteAccount: (data: any, idToken?: string) => 
    callFirebaseFunction('deleteAccount', data, idToken),
  trackArticleView: (data: any, idToken?: string) => 
    callFirebaseFunction('trackArticleView', data, idToken),
  manageBookmarks: (data: any, idToken?: string) => 
    callFirebaseFunction('manageBookmarks', data, idToken),
  registerNotificationToken: (data: any, idToken?: string) => 
    callFirebaseFunction('registerNotificationToken', data, idToken),
  updateNotificationPreferences: (data: any, idToken?: string) => 
    callFirebaseFunction('updateNotificationPreferences', data, idToken),
  trackShare: (data: any, idToken?: string) => 
    callFirebaseFunction('trackShare', data, idToken),
  getShareStats: (data: any, idToken?: string) => 
    callFirebaseFunction('getShareStats', data, idToken),
  
  // Admin functions
  adminDeleteUser: (data: any, idToken?: string) => 
    callFirebaseFunction('adminDeleteUser', data, idToken),
  getSystemHealth: (data?: any, idToken?: string) => 
    callFirebaseFunction('getSystemHealth', data, idToken),
  updateUserLimit: (data: any, idToken?: string) => 
    callFirebaseFunction('updateUserLimit', data, idToken),
  createPortalSession: (data?: any, idToken?: string) => 
    callFirebaseFunction('createPortalSession', data, idToken),
  
  // Admin analytics
  getSubscriptionAnalytics: (data?: any, idToken?: string) => 
    callFirebaseFunction('getSubscriptionAnalytics', data, idToken),
  cleanupSubscriptions: (data: any, idToken?: string) => 
    callFirebaseFunction('cleanupSubscriptions', data, idToken),
  fixEntitlements: (data?: any, idToken?: string) => 
    callFirebaseFunction('fixEntitlements', data, idToken),
  fixSubscriptions: (data: any, idToken?: string) => 
    callFirebaseFunction('fixSubscriptions', data, idToken),
  getUserEntitlements: (data: any, idToken?: string) => 
    callFirebaseFunction('getUserEntitlements', data, idToken),
  updateMaintenanceStatus: (data: any, idToken?: string) => 
    callFirebaseFunction('updateMaintenanceStatus', data, idToken),
  getSystemHealthConsistency: (data?: any, idToken?: string) => 
    callFirebaseFunction('getSystemHealthConsistency', data, idToken),
  getSubscriptionHealth: (data?: any, idToken?: string) => 
    callFirebaseFunction('getSubscriptionHealth', data, idToken),
  getArticleStats: (data?: any, idToken?: string) => 
    callFirebaseFunction('getArticleStats', data, idToken),
  
  // Extended operations
  syncBugs: (data: any, idToken?: string) => 
    callFirebaseFunction('syncBugs', data, idToken),
  getTextbookVocabulary: (data: any, idToken?: string) => 
    callFirebaseFunction('getTextbookVocabulary', data, idToken),
  createReferral: (data: any, idToken?: string) => 
    callFirebaseFunction('createReferral', data, idToken),
  testNotification: (data?: any, idToken?: string) => 
    callFirebaseFunction('testNotification', data, idToken),
  trackNotificationClick: (data: any, idToken?: string) => 
    callFirebaseFunction('trackNotificationClick', data, idToken),
  trackNotificationDismiss: (data: any, idToken?: string) => 
    callFirebaseFunction('trackNotificationDismiss', data, idToken),
  adminBroadcast: (data: any, idToken?: string) => 
    callFirebaseFunction('adminBroadcast', data, idToken),
  adminTestNotification: (data: any, idToken?: string) => 
    callFirebaseFunction('adminTestNotification', data, idToken),
  debugYouTubeLimits: (data?: any, idToken?: string) => 
    callFirebaseFunction('debugYouTubeLimits', data, idToken),
  rebuildConfig: (data?: any, idToken?: string) => 
    callFirebaseFunction('rebuildConfig', data, idToken),
  reloadEntitlementRules: (data?: any, idToken?: string) => 
    callFirebaseFunction('reloadEntitlementRules', data, idToken),
  testStorage: (data?: any, idToken?: string) => 
    callFirebaseFunction('testStorage', data, idToken),
  updatePricingConfig: (data: any, idToken?: string) => 
    callFirebaseFunction('updatePricingConfig', data, idToken),
  manageEntitlements: (data: any, idToken?: string) => 
    callFirebaseFunction('manageEntitlements', data, idToken),
};