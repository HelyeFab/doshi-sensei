import * as admin from 'firebase-admin';

// Singleton instance and initialization state
let adminApp: admin.app.App | null = null;
let initializationPromise: Promise<void> | null = null;
let initializationError: Error | null = null;

// Type guard for service account
interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id?: string;
  private_key: string;
  client_email: string;
  client_id?: string;
  auth_uri?: string;
  token_uri?: string;
  auth_provider_x509_cert_url?: string;
  client_x509_cert_url?: string;
  universe_domain?: string;
}

function isValidServiceAccount(obj: any): obj is ServiceAccount {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.project_id === 'string' &&
    typeof obj.private_key === 'string' &&
    typeof obj.client_email === 'string'
  );
}

/**
 * Initialize Firebase Admin SDK safely for production use
 * Handles various deployment environments and credential formats
 */
async function initializeAdmin(): Promise<void> {
  // If initialization failed before, throw the error
  if (initializationError) {
    throw initializationError;
  }

  // If already initializing, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  // If already initialized, return immediately
  if (adminApp || admin.apps.length > 0) {
    adminApp = admin.apps[0];
    return;
  }

  // Start initialization
  initializationPromise = (async () => {
    try {
      const projectId = process.env.FIREBASE_PROJECT_ID ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
        "doshi-sensei";

      let initialized = false;

      // Method 1: Full service account JSON in environment variable
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

          if (isValidServiceAccount(serviceAccount)) {
            adminApp = admin.initializeApp({
              credential: admin.credential.cert(serviceAccount),
              projectId: serviceAccount.project_id || projectId,
            });
            initialized = true;
          } else {
            console.error('Invalid service account structure in FIREBASE_SERVICE_ACCOUNT_KEY');
          }
        } catch (parseError) {
          console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', parseError);
        }
      }

      // Method 2: Individual environment variables
      if (!initialized && (process.env.FIREBASE_PRIVATE_KEY || process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY) && (process.env.FIREBASE_CLIENT_EMAIL || process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL)) {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL;
        const clientId = process.env.FIREBASE_CLIENT_ID || process.env.NEXT_PUBLIC_FIREBASE_CLIENT_ID || "";
        const privateKeyId = process.env.FIREBASE_PRIVATE_KEY_ID || process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY_ID || "";
        const serviceAccount: ServiceAccount = {
          type: "service_account",
          project_id: projectId,
          private_key_id: privateKeyId,
          private_key: privateKey.replace(/\\n/g, '\n'),
          client_email: clientEmail,
          client_id: clientId,
          auth_uri: "https://accounts.google.com/o/oauth2/auth",
          token_uri: "https://oauth2.googleapis.com/token",
          auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
          client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail)}`,
          universe_domain: "googleapis.com"
        };
        try {
          adminApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId,
          });
          initialized = true;
        } catch (credError) {
          console.error('Failed to initialize with individual env vars:', credError);
        }
      }

      // Method 3: Application Default Credentials (for Google Cloud environments)
      if (!initialized && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        try {
          adminApp = admin.initializeApp({
            projectId,
          });
          initialized = true;
        } catch (adcError) {
          console.error('Failed to initialize with ADC:', adcError);
        }
      }

      // Method 4: Minimal initialization (very limited functionality)
      if (!initialized) {
        console.warn('Initializing Firebase Admin with project ID only - limited functionality');
        adminApp = admin.initializeApp({ projectId });
      }

      // Log success without exposing sensitive data
      console.log(`Firebase Admin initialized for project: ${projectId}`);

    } catch (error) {
      initializationError = error instanceof Error ? error : new Error('Unknown initialization error');
      initializationPromise = null; // Allow retry
      throw initializationError;
    }
  })();

  return initializationPromise;
}

/**
 * Get Firebase Admin instance for use in API routes
 * @throws {Error} If initialization fails
 */
export async function getFirebaseAdmin(): Promise<typeof admin> {
  await initializeAdmin();
  return admin;
}

/**
 * Get Firebase Admin instance synchronously (use with caution)
 * May not be initialized - only use where async is not possible
 */
export function getFirebaseAdminSync(): typeof admin {
  if (!adminApp && admin.apps.length === 0) {
    console.warn('Firebase Admin accessed before initialization - operations may fail');
  }
  return admin;
}

/**
 * Check if Firebase Admin is initialized
 */
export function isFirebaseAdminInitialized(): boolean {
  return !!(adminApp || admin.apps.length > 0);
}

/**
 * Get initialization error if any
 */
export function getInitializationError(): Error | null {
  return initializationError;
}

// Export both named and default
export default {
  getFirebaseAdmin,
  getFirebaseAdminSync,
  isFirebaseAdminInitialized,
  getInitializationError
};
