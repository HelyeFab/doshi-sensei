exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight successful' }),
    };
  }

  // Check all required environment variables
  const requiredEnvVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY_ID', 
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_CLIENT_ID'
  ];

  const optionalEnvVars = [
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NETLIFY_DEV',
    'NODE_ENV',
    'URL',
    'DEPLOY_URL'
  ];

  const envStatus = {};
  const missingRequired = [];

  // Check required variables
  requiredEnvVars.forEach(varName => {
    const exists = !!process.env[varName];
    envStatus[varName] = exists;
    if (!exists) {
      missingRequired.push(varName);
    }
  });

  // Check optional variables
  optionalEnvVars.forEach(varName => {
    envStatus[varName] = !!process.env[varName];
  });

  // Check if private key needs line break fixes
  let privateKeyInfo = null;
  if (process.env.FIREBASE_PRIVATE_KEY) {
    const key = process.env.FIREBASE_PRIVATE_KEY;
    privateKeyInfo = {
      length: key.length,
      hasLineBreaks: key.includes('\n'),
      hasEscapedLineBreaks: key.includes('\\n'),
      startsWithDash: key.startsWith('-----'),
      endsWithDash: key.endsWith('-----')
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: missingRequired.length === 0,
      message: missingRequired.length === 0 
        ? 'All required environment variables are present' 
        : `Missing ${missingRequired.length} required environment variables`,
      environment: envStatus,
      missingRequired,
      privateKeyInfo,
      timestamp: new Date().toISOString()
    }, null, 2),
  };
};