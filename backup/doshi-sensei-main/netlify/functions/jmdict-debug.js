const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Test multiple file paths
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'dict', 'JMdict_e_examp'),
      path.join(__dirname, '..', '..', 'public', 'dict', 'JMdict_e_examp'),
      path.join('/var/task', 'public', 'dict', 'JMdict_e_examp'),
      '/tmp/JMdict_e_examp'
    ];

    const results = [];

    for (const testPath of possiblePaths) {
      try {
        const stats = await fs.stat(testPath);
        results.push({
          path: testPath,
          exists: true,
          size: stats.size,
          isFile: stats.isFile()
        });
      } catch (error) {
        results.push({
          path: testPath,
          exists: false,
          error: error.message
        });
      }
    }

    // Also test current working directory contents
    let cwdContents = [];
    try {
      cwdContents = await fs.readdir(process.cwd());
    } catch (error) {
      cwdContents = [`Error reading cwd: ${error.message}`];
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        cwd: process.cwd(),
        cwdContents,
        __dirname,
        pathTests: results,
        environment: process.env.NODE_ENV || 'unknown'
      }, null, 2)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
