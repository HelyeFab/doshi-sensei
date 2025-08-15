#!/usr/bin/env node

/**
 * Script to backup all articles from Firestore before migration
 * This creates a JSON backup file with timestamp
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function backupArticles() {
  console.log('🔄 Starting article backup...');
  
  try {
    // Get all articles
    const snapshot = await db.collection('articles').get();
    
    if (snapshot.empty) {
      console.log('❌ No articles found in database');
      return;
    }
    
    const articles = [];
    const stats = {
      total: 0,
      japanese: 0,
      english: 0,
      validated: 0,
      sources: {}
    };
    
    // Process each article
    snapshot.forEach(doc => {
      const data = doc.data();
      articles.push({
        id: doc.id,
        ...data,
        // Convert Firestore timestamps to ISO strings
        publishDate: data.publishDate?.toDate?.()?.toISOString() || data.publishDate,
        scrapedAt: data.scrapedAt?.toDate?.()?.toISOString() || data.scrapedAt,
        lastValidated: data.lastValidated?.toDate?.()?.toISOString() || data.lastValidated
      });
      
      // Collect statistics
      stats.total++;
      if (data.aiValidated) stats.validated++;
      if (data.quickValidation?.passed === false) stats.english++;
      else stats.japanese++;
      
      // Count by source
      const source = data.source || 'unknown';
      stats.sources[source] = (stats.sources[source] || 0) + 1;
    });
    
    // Create backup directory if it doesn't exist
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Save to file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = path.join(backupDir, `articles-backup-${timestamp}.json`);
    
    fs.writeFileSync(filename, JSON.stringify({
      metadata: {
        backupDate: new Date().toISOString(),
        totalArticles: articles.length,
        statistics: stats
      },
      articles: articles
    }, null, 2));
    
    console.log('✅ Backup completed successfully!');
    console.log(`📁 File: ${filename}`);
    console.log('\n📊 Statistics:');
    console.log(`  Total articles: ${stats.total}`);
    console.log(`  Japanese: ${stats.japanese}`);
    console.log(`  English/Invalid: ${stats.english}`);
    console.log(`  AI Validated: ${stats.validated}`);
    console.log('\n📰 By Source:');
    Object.entries(stats.sources).forEach(([source, count]) => {
      console.log(`  ${source}: ${count}`);
    });
    
    // Also create a smaller sample file for testing
    const sampleFilename = path.join(backupDir, `articles-sample-${timestamp}.json`);
    fs.writeFileSync(sampleFilename, JSON.stringify({
      metadata: {
        backupDate: new Date().toISOString(),
        sampleSize: 10,
        totalArticles: articles.length
      },
      articles: articles.slice(0, 10)
    }, null, 2));
    console.log(`\n📁 Sample file (10 articles): ${sampleFilename}`);
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the backup
backupArticles();