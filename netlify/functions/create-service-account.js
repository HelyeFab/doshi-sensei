// Script to create base64 encoded service account for Netlify
const fs = require('fs');

const serviceAccount = {
  "type": "service_account",
  "project_id": "doshi-sensei",
  "private_key_id": "4800c07db9ac343dbbf7d53f7dfd8e7d296e2470",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCXf1sblgS88vM3\no0EhnSOkf7EUcGZKdEAftrR1ZAumRB5e0GKjr0dU1LvAOlzLd9h+sPuaolJaMVX0\njJ/D50CMa5PhIYXxvbsz5cycYck9Yv0eWm92UHV8AiYVVFryMiA6vi7LCeN/03Xu\np9JMHLQeTy521hgLt963zY5kVn7kPVhaoOyfINiN0HxXBrFZjiywXGPhJH90YyD9\nKhffBi9VewPWVv4T1iZqbHmDMFacdNkyOx+ALJnVpmC/jFkUA3/RxyVT+X3/2lzr\nkG3ZgGWkmlH+1901lnZ4wUWo6SHRYBF5rIR+bAt4VGAcy96hiHAONNMvdTFD+XZp\nqKZ0JZkrAgMBAAECggEABJCQd4hRpDp9xui4XFbrwq0bnM4LhvrHDoLmymgKodEz\nnmUQ/nWYOfTJo2/JaVK3HI917/bWxw5C1MItSNh9mBLgZcwoyQaPzsSBzG8ggnpV\nE3EOIrZ8k7v3gcpaOH9M0U2hrfnM97EGFfwgg1fqEBplVVdQv375daL6mLNdJ2tV\n5qrAqx96HkrjQe1MLjf91o+bin33zyL/HIoXbvTi2j3vjKF/xyrSSHXTobQxvwxs\nj3HvNfRhDM+euwF79BOX8yMdU6pW9RO//iDIRoRTatvbP+3FYsm7sn4CuuVq9Dcc\nIGrhnmdnqwKzmnWBM26zdFADrF4Byl0pUpWYlGZrIQKBgQDGIJlLL2Y9ye5wK6PT\nJTWhqKQTwm7PlWR5dLNoVlMQNqti5A320dMBSXqpq4ydu6tEF0ary3Cg6UmDX1id\nkT1fLNewJixkg1YEeme+9neAYIfYtB7qBNZnKeC4w9QTQrCm4+Mi1JW0ocayqsOn\nU2IuAytGWwm/7V2HPf5ihlcAdQKBgQDDv+iaR29ATgmaf1KE5onMuvUPBtUxtzhF\nELDxFVz6Pf7ukmMTnfsBcMo3RWz/gGXlJ5h+b/2dJ70IP9mi748n5VvzhafEsIqa\nOsgXNcFBVMKvxPjovyAEvBLdrIoDdKl+spwAhkTfFNH2acOi34jB6WYz7qYbYXZK\n0TqJKIj/HwKBgEv3I8+YFPOMAUgw81d55N5e8spAuowNE8Ed5cwTjTWiQIRiPJhu\nSyErM0Tq6bdwxXIOGqK0FjMcP3uHi0qe7ZEYeHqpqEvBr7F33V9y0M8ANBX6uf+w\naySTAf7V1vKrl1/l8KjiKaRggvbuUqZNak+KF4WaUlqsgDfipS7Ro3ohAoGAdevN\n++K8qkhYkLHSzCz1JlgZ+IttMx3kz/ZWIWV1NWrTgHS/Kroo051WtCUmnGSE/Z70\nxnZAmcOupKGSQg1+d9I7qmAByQNw+6gdkZ3YZbrh7XEDYXKBn1iNJO0j1yEYWjLO\nt6IrKxgnxAHC0QNIJ0irQO2rMyNrV3bjhGze2pECgYAd8UUF9J4Pus52glKn57b/\nzLswDADDW376M/rrzBOHe7AVS/YrjJzm02/k6YDJdT4GPMjsnM5o20854wVYG6pm\ndUnW2OjJ7sxKDazqhlLeVN6zxKDsSwswzMfBkXoxumrTdn1GgC3RKxssLClREWCr\neWUiPERNGlkFzFYJ9vo81g==\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@doshi-sensei.iam.gserviceaccount.com",
  "client_id": "113309372391824156109",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40doshi-sensei.iam.gserviceaccount.com"
};

// Convert to base64
const base64 = Buffer.from(JSON.stringify(serviceAccount)).toString('base64');

console.log('Base64 encoded service account (add this as FIREBASE_SERVICE_ACCOUNT_BASE64 in Netlify):');
console.log('');
console.log(base64);
console.log('');
console.log(`Length: ${base64.length} characters (${(base64.length / 1024).toFixed(2)} KB)`);

// Save to file for reference
fs.writeFileSync('service-account-base64.txt', base64);
console.log('Saved to service-account-base64.txt');