#!/usr/bin/env node

// This script fixes daily activities that have undefined fields in Firebase
// Run this to clean up existing data that's causing sync errors

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixDailyActivities() {
  console.log('🔧 Fixing daily activities with undefined fields...\n');

  try {
    // Get all users with stats
    const usersSnapshot = await db.collection('userStats').get();
    console.log(`Found ${usersSnapshot.size} users with stats\n`);

    let totalFixed = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      console.log(`Checking user: ${userId}`);

      // Get daily activities for this user
      const activitiesSnapshot = await db
        .collection('userStats')
        .doc(userId)
        .collection('dailyActivities')
        .get();

      console.log(`  Found ${activitiesSnapshot.size} daily activities`);

      for (const activityDoc of activitiesSnapshot.docs) {
        const date = activityDoc.id;
        const data = activityDoc.data();
        
        // Check if data needs fixing
        const needsFix = !data.summary?.practiceSessionsCompleted && 
                        data.summary?.practiceSessionsCompleted !== 0;

        if (needsFix) {
          console.log(`  Fixing activity for date: ${date}`);
          
          // Create sanitized activity
          const sanitized = {
            date: data.date || date,
            activities: data.activities || [],
            summary: {
              totalActivities: data.summary?.totalActivities || 0,
              drillsCompleted: data.summary?.drillsCompleted || 0,
              storiesRead: data.summary?.storiesRead || 0,
              articlesRead: data.summary?.articlesRead || 0,
              kanjiStudied: data.summary?.kanjiStudied || 0,
              gamesPlayed: data.summary?.gamesPlayed || 0,
              vocabStudied: data.summary?.vocabStudied || 0,
              flashcardsReviewed: data.summary?.flashcardsReviewed || 0,
              practiceSessionsCompleted: data.summary?.practiceSessionsCompleted || 0,
              totalScore: data.summary?.totalScore || 0,
              totalCorrect: data.summary?.totalCorrect || 0,
              totalQuestions: data.summary?.totalQuestions || 0
            }
          };

          // Update the document
          await activityDoc.ref.set(sanitized);
          totalFixed++;
        }
      }
      console.log('');
    }

    console.log(`✅ Fixed ${totalFixed} daily activities`);

  } catch (error) {
    console.error('❌ Error fixing daily activities:', error);
  }

  process.exit(0);
}

// Check if firebase-service-account.json exists
const fs = require('fs');
if (!fs.existsSync('./firebase-service-account.json')) {
  console.error('❌ Error: firebase-service-account.json not found');
  console.error('Please download your Firebase service account key and save it as firebase-service-account.json');
  process.exit(1);
}

// Run the fix
fixDailyActivities();