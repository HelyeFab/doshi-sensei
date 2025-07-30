const fs = require('fs');

// Read the service account file
const serviceAccount = JSON.parse(fs.readFileSync('firebase-service-account.json', 'utf8'));

// Convert to single line string
const stringified = JSON.stringify(serviceAccount);

console.log('Add this to Netlify environment variables:\n');
console.log('Key: FIREBASE_SERVICE_ACCOUNT');
console.log('Value:');
console.log(stringified);
console.log('\n✅ Copy the value above and add it to Netlify');
console.log('   Go to: Site settings → Environment variables → Add a variable');
console.log('\nAlso make sure these other variables are set:');
console.log('- STRIPE_SECRET_KEY');
console.log('- STRIPE_WEBHOOK_SECRET'); 
console.log('- NEXT_PUBLIC_FIREBASE_PROJECT_ID (should be: doshi-sensei)');
console.log('- NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID');