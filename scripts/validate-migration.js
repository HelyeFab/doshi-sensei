#!/usr/bin/env node
/**
 * Migration Validation Script
 * Checks for clean subscription structure after migration
 */

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function validateMigration() {
  console.log('🔍 Starting migration validation...\n');
  
  const results = {
    total: 0,
    clean: 0,
    issues: [],
    nested: 0,
    missingPlan: 0,
    wrongStructure: 0,
    hasOldFields: 0
  };
  
  const users = await db.collection('users').get();
  
  for (const doc of users.docs) {
    const userData = doc.data();
    results.total++;
    
    let hasIssue = false;
    
    // Check for clean structure
    if (userData.subscription) {
      // Check for nested structure (BAD)
      if (userData.subscription.subscription) {
        results.nested++;
        results.issues.push({
          userId: doc.id,
          email: userData.email,
          issue: 'Nested subscription.subscription structure found',
          severity: 'CRITICAL'
        });
        hasIssue = true;
      }
      
      // Check for required fields
      if (!userData.subscription.plan) {
        results.missingPlan++;
        results.issues.push({
          userId: doc.id,
          email: userData.email,
          issue: 'Missing subscription.plan field',
          severity: 'HIGH'
        });
        hasIssue = true;
      }
      
      // Check for old fields that shouldn't exist
      if (userData.subscription.limits || userData.subscription.currentUsage) {
        results.hasOldFields++;
        results.issues.push({
          userId: doc.id,
          email: userData.email,
          issue: 'Old fields (limits/currentUsage) in subscription object',
          severity: 'MEDIUM'
        });
        hasIssue = true;
      }
      
      // Validate plan values
      if (userData.subscription.plan) {
        const validPlans = ['free', 'monthly', 'yearly'];
        if (!validPlans.includes(userData.subscription.plan)) {
          results.wrongStructure++;
          results.issues.push({
            userId: doc.id,
            email: userData.email,
            issue: `Invalid plan value: ${userData.subscription.plan}`,
            severity: 'HIGH'
          });
          hasIssue = true;
        }
      }
      
      // Check for conflicting values
      if (userData.subscription.plan && userData.subscription.subscription?.plan) {
        if (userData.subscription.plan !== userData.subscription.subscription.plan) {
          results.issues.push({
            userId: doc.id,
            email: userData.email,
            issue: `Conflicting plans: outer="${userData.subscription.plan}", inner="${userData.subscription.subscription.plan}"`,
            severity: 'CRITICAL'
          });
          hasIssue = true;
        }
      }
    }
    
    if (!hasIssue) {
      results.clean++;
    }
  }
  
  // Print results
  console.log('📊 VALIDATION RESULTS');
  console.log('====================');
  console.log(`Total users: ${results.total}`);
  console.log(`Clean users: ${results.clean} ${results.clean === results.total ? '✅' : '⚠️'}`);
  console.log(`Issues found: ${results.issues.length} ${results.issues.length === 0 ? '✅' : '❌'}`);
  
  if (results.issues.length > 0) {
    console.log('\nISSUE BREAKDOWN:');
    console.log(`- Nested structures: ${results.nested}`);
    console.log(`- Missing plan field: ${results.missingPlan}`);
    console.log(`- Wrong structure: ${results.wrongStructure}`);
    console.log(`- Has old fields: ${results.hasOldFields}`);
    
    // Group by severity
    const critical = results.issues.filter(i => i.severity === 'CRITICAL');
    const high = results.issues.filter(i => i.severity === 'HIGH');
    const medium = results.issues.filter(i => i.severity === 'MEDIUM');
    
    if (critical.length > 0) {
      console.log('\n🔴 CRITICAL ISSUES:');
      critical.forEach(issue => {
        console.log(`- ${issue.email || issue.userId}: ${issue.issue}`);
      });
    }
    
    if (high.length > 0) {
      console.log('\n🟡 HIGH PRIORITY ISSUES:');
      high.forEach(issue => {
        console.log(`- ${issue.email || issue.userId}: ${issue.issue}`);
      });
    }
    
    if (medium.length > 0) {
      console.log('\n🟢 MEDIUM PRIORITY ISSUES:');
      medium.forEach(issue => {
        console.log(`- ${issue.email || issue.userId}: ${issue.issue}`);
      });
    }
    
    // Save detailed report
    const fs = require('fs').promises;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `validation-report-${timestamp}.json`;
    await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
  } else {
    console.log('\n✅ ALL USERS HAVE CLEAN STRUCTURE!');
    console.log('🎉 Migration validation PASSED!');
  }
  
  // Return status code
  return results.issues.length === 0 ? 0 : 1;
}

// Run validation
validateMigration()
  .then(exitCode => process.exit(exitCode))
  .catch(err => {
    console.error('❌ Validation failed:', err);
    process.exit(1);
  });