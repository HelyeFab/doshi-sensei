const admin = require('firebase-admin');
const https = require('https');
const { URL } = require('url');
const zlib = require('zlib');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  try {
    // Test 1: Check if all modules are loaded
    const moduleCheck = {
      admin: !!admin,
      https: !!https,
      URL: !!URL,
      zlib: !!zlib,
      firebaseApps: admin.apps.length
    };

    // Test 2: Try to initialize Firebase if needed
    let firebaseStatus = 'not initialized';
    if (!admin.apps.length) {
      try {
        const serviceAccount = {
          type: "service_account",
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
          private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          client_id: process.env.FIREBASE_CLIENT_ID,
          auth_uri: "https://accounts.google.com/o/oauth2/auth",
          token_uri: "https://oauth2.googleapis.com/token",
          auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
          client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
        };

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        firebaseStatus = 'initialized successfully';
      } catch (error) {
        firebaseStatus = `initialization failed: ${error.message}`;
      }
    } else {
      firebaseStatus = 'already initialized';
    }

    // Test 3: Simple HTTP request
    let httpTest = 'not tested';
    try {
      const testUrl = new URL('https://www.google.com');
      httpTest = `URL parsed: ${testUrl.hostname}`;
    } catch (error) {
      httpTest = `URL parse failed: ${error.message}`;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        modules: moduleCheck,
        firebase: firebaseStatus,
        httpTest: httpTest,
        env: {
          hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
          hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
          hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL
        }
      }, null, 2)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }, null, 2)
    };
  }
};