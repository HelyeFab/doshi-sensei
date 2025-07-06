exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // List of expected environment variables
  const expectedVars = [
    'FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_CLIENT_ID'
  ];

  const envStatus = {};
  
  expectedVars.forEach(varName => {
    envStatus[varName] = {
      exists: !!process.env[varName],
      length: process.env[varName]?.length || 0,
      preview: process.env[varName] ? 
        (varName.includes('PRIVATE_KEY') ? '[REDACTED]' : process.env[varName].substring(0, 20) + '...') 
        : 'NOT SET'
    };
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Environment variables check',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'not set',
      context: context.functionName,
      envStatus
    }, null, 2)
  };
};