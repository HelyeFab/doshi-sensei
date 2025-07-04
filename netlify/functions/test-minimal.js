// Minimal test function
exports.handler = async (event, context) => {
  console.log('TEST FUNCTION CALLED');
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Test function works!',
      time: new Date().toISOString()
    })
  };
};