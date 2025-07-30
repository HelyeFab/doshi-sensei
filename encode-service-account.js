const fs = require('fs');

// Read the service account file
const serviceAccount = fs.readFileSync('firebase-service-account.json', 'utf8');

// Convert to base64
const base64Encoded = Buffer.from(serviceAccount).toString('base64');

console.log('Base64 encoded service account:');
console.log('================================');
console.log(base64Encoded);
console.log('================================');
console.log('\nLength:', base64Encoded.length, 'characters');
console.log('\nInstructions:');
console.log('1. Delete the current FIREBASE_SERVICE_ACCOUNT variable in Netlify');
console.log('2. Create a new one with the base64 value above');
console.log('3. Update the webhook code to decode from base64');