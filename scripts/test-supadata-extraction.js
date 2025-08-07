#!/usr/bin/env node

/**
 * Test script for YouTube/SupaData extraction
 * Usage: node scripts/test-supadata-extraction.js [youtube-url]
 */

const axios = require('axios');

async function testExtraction(url) {
  const testUrl = url || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Rick Roll as default test
  
  console.log('🧪 Testing YouTube extraction API...');
  console.log('📺 URL:', testUrl);
  console.log('🌐 API Endpoint: http://localhost:3000/api/youtube/extract');
  console.log('');

  try {
    const startTime = Date.now();
    
    const response = await axios.post('http://localhost:3000/api/youtube/extract', {
      url: testUrl
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    const elapsed = Date.now() - startTime;
    
    console.log('✅ SUCCESS!');
    console.log('⏱️  Time taken:', (elapsed / 1000).toFixed(2), 'seconds');
    console.log('');
    console.log('📊 Response Summary:');
    console.log('  - Success:', response.data.success);
    console.log('  - Method:', response.data.method);
    console.log('  - From Cache:', response.data.fromCache || false);
    console.log('  - Video Title:', response.data.videoTitle);
    console.log('  - Language:', response.data.language);
    console.log('  - Transcript Lines:', response.data.transcript?.length || 0);
    
    if (response.data.transcript && response.data.transcript.length > 0) {
      console.log('');
      console.log('📝 First 3 transcript lines:');
      response.data.transcript.slice(0, 3).forEach((line, i) => {
        console.log(`  ${i + 1}. [${line.startTime.toFixed(1)}s] ${line.text}`);
      });
    }

    if (response.data.videoMetadata) {
      console.log('');
      console.log('🎬 Video Metadata:');
      console.log('  - Channel:', response.data.videoMetadata.channelTitle);
      console.log('  - Duration:', response.data.videoMetadata.duration);
      console.log('  - Published:', response.data.videoMetadata.publishedAt);
    }

  } catch (error) {
    console.error('❌ FAILED!');
    console.error('');
    
    if (error.response) {
      // Server responded with error
      console.error('📛 Server Error:', error.response.status);
      console.error('💬 Error Message:', error.response.data.error);
      
      if (error.response.data.suggestions) {
        console.error('');
        console.error('💡 Suggestions:');
        error.response.data.suggestions.forEach(s => {
          console.error('  •', s);
        });
      }
      
      if (error.response.data.technicalDetails) {
        console.error('');
        console.error('🔧 Technical Details:', error.response.data.technicalDetails);
      }
    } else if (error.request) {
      // No response received
      console.error('🔌 No response from server - is the dev server running?');
      console.error('   Run: npm run dev');
    } else {
      // Request setup error
      console.error('🐛 Error:', error.message);
    }
  }
}

// Run the test
const url = process.argv[2];
testExtraction(url).then(() => {
  console.log('');
  console.log('🏁 Test complete!');
  process.exit(0);
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});