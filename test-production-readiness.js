#!/usr/bin/env node

const chalk = require('chalk') || { green: (s) => s, red: (s) => s, yellow: (s) => s, blue: (s) => s };

console.log(chalk.blue('\n🔍 Production Readiness Test Suite\n'));

const tests = {
  'Environment Variables': {
    'Production Stripe Key': () => {
      const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      return key && key.startsWith('pk_live_');
    },
    'Production Webhook Secret': () => {
      const secret = process.env.STRIPE_WEBHOOK_SECRET;
      return secret && secret.startsWith('whsec_');
    },
    'Firebase Project ID': () => {
      return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === 'doshi-sensei';
    },
    'App URL': () => {
      return process.env.NEXT_PUBLIC_APP_URL === 'https://doshisensei.com';
    }
  },
  'Critical Files': {
    'Subscription Manager': () => {
      const fs = require('fs');
      const content = fs.readFileSync('./src/lib/subscriptions/manager.ts', 'utf8');
      // Check for the critical fix - getUserType should use plan, not status
      return !content.includes("status === 'active'") && 
             content.includes("const plan = subscription.plan");
    },
    'Webhook Handler': () => {
      const fs = require('fs');
      const content = fs.readFileSync('./functions/src/index.ts', 'utf8');
      // Check for invoice saving fix
      return content.includes("if (invoice.tax !== null && invoice.tax !== undefined)");
    },
    'Cancel Route': () => {
      const fs = require('fs');
      const content = fs.readFileSync('./src/app/api/cancel-subscription/route.ts', 'utf8');
      // Should NOT update Firestore directly
      return !content.includes("await updateDoc(userRef");
    }
  },
  'User Entitlements': {
    'YouTube Shadowing Limits': () => {
      const rules = require('./src/lib/entitlements/rules.ts');
      const content = require('fs').readFileSync('./src/lib/entitlements/rules.ts', 'utf8');
      // Premium users should have -1 (unlimited)
      return content.includes("youtube_shadowing: -1");
    },
    'Feature Registry': () => {
      const fs = require('fs');
      const content = fs.readFileSync('./src/lib/features/registry.ts', 'utf8');
      return content.includes("'youtube_shadowing'");
    }
  }
};

let totalTests = 0;
let passedTests = 0;
let criticalFailures = [];

Object.entries(tests).forEach(([category, categoryTests]) => {
  console.log(chalk.yellow(`\n${category}:`));
  
  Object.entries(categoryTests).forEach(([testName, testFn]) => {
    totalTests++;
    try {
      const result = testFn();
      if (result) {
        console.log(chalk.green(`  ✅ ${testName}`));
        passedTests++;
      } else {
        console.log(chalk.red(`  ❌ ${testName}`));
        criticalFailures.push(`${category}: ${testName}`);
      }
    } catch (error) {
      console.log(chalk.red(`  ❌ ${testName} - ${error.message}`));
      criticalFailures.push(`${category}: ${testName}`);
    }
  });
});

console.log(chalk.blue(`\n📊 Results: ${passedTests}/${totalTests} tests passed\n`));

if (criticalFailures.length > 0) {
  console.log(chalk.red('⚠️  Critical Failures:'));
  criticalFailures.forEach(failure => {
    console.log(chalk.red(`  - ${failure}`));
  });
  console.log(chalk.yellow('\n⚠️  DO NOT DEPLOY TO PRODUCTION until all tests pass!\n'));
  process.exit(1);
} else {
  console.log(chalk.green('✅ All tests passed! Ready for production.\n'));
  console.log(chalk.blue('Final Checklist Before Real Money Test:'));
  console.log('1. Verify Stripe Dashboard webhook is active');
  console.log('2. Check Netlify deployment completed successfully');
  console.log('3. Test with a logged-in premium user');
  console.log('4. Monitor Firebase Functions logs during first transaction\n');
}