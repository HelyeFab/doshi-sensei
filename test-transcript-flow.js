#!/usr/bin/env node

/**
 * Test script to analyze the transcript regeneration flow
 * Tests: extraction -> formatting -> caching -> retrieval
 */

const videoUrl = 'https://youtu.be/iLDeRUyWuMc';

async function testTranscriptFlow() {
  console.log('🔍 Testing Transcript Flow for:', videoUrl);
  console.log('='*60);
  
  // Step 1: Extract raw transcript
  console.log('\n📥 STEP 1: Extracting raw transcript from YouTube...');
  const extractResponse = await fetch('http://localhost:3004/api/youtube/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: videoUrl,
      provider: 'supadata',
      forceRegenerate: true
    })
  });
  
  const extractData = await extractResponse.json();
  
  if (!extractData.success) {
    console.error('❌ Failed to extract transcript:', extractData.error);
    return;
  }
  
  console.log('✅ Extracted transcript with', extractData.transcript.length, 'segments');
  console.log('\n📋 First 5 segments (RAW):');
  extractData.transcript.slice(0, 5).forEach((seg, i) => {
    console.log(`  ${i + 1}. [${seg.startTime.toFixed(2)}s - ${seg.endTime.toFixed(2)}s] ${seg.text}`);
  });
  
  // Step 2: Test AI formatting directly
  console.log('\n🤖 STEP 2: Testing AI formatting...');
  const contentId = `youtube_${videoUrl.match(/[?&]v=([^&]+)|youtu\.be\/([^?]+)/)?.[1] || videoUrl.match(/youtu\.be\/([^?]+)/)?.[1]}`;
  console.log('Content ID:', contentId);
  
  const formatResponse = await fetch('http://localhost:3004/api/ai/format-transcript', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contentId: contentId,
      transcript: extractData.transcript,
      language: 'ja'
    })
  });
  
  const formatData = await formatResponse.json();
  
  if (!formatData.success) {
    console.error('❌ Failed to format transcript:', formatData.error);
    console.log('Response:', formatData);
  } else {
    console.log('✅ Formatted transcript into', formatData.formattedTranscript.length, 'segments');
    console.log('📊 Stats:', formatData.stats);
    console.log('\n📋 First 5 segments (FORMATTED):');
    formatData.formattedTranscript.slice(0, 5).forEach((seg, i) => {
      console.log(`  ${i + 1}. [${seg.startTime.toFixed(2)}s - ${seg.endTime.toFixed(2)}s] ${seg.text}`);
    });
    
    // Check for grammar rule violations
    console.log('\n🔍 Checking for grammar violations...');
    let violations = [];
    formatData.formattedTranscript.forEach((seg, i) => {
      // Check if です/ます/でした/ました appears at the start (indicating improper split)
      if (seg.text.match(/^(です|ます|でした|ました|だ|だった)/)) {
        violations.push({
          index: i,
          text: seg.text,
          issue: 'Starts with copula/auxiliary verb'
        });
      }
      // Check if sentence ends without proper ending
      if (seg.text.match(/の$|が$|を$|に$|は$/)) {
        violations.push({
          index: i,
          text: seg.text,
          issue: 'Ends with particle (incomplete sentence)'
        });
      }
    });
    
    if (violations.length > 0) {
      console.log('⚠️ Found', violations.length, 'potential grammar violations:');
      violations.slice(0, 5).forEach(v => {
        console.log(`  Line ${v.index}: "${v.text}" - ${v.issue}`);
      });
    } else {
      console.log('✅ No obvious grammar violations found!');
    }
  }
  
  // Step 3: Check what's in cache
  console.log('\n💾 STEP 3: Checking cache...');
  // This would require direct Firestore access, so we'll skip for now
  console.log('(Cache check would require Firestore access)');
  
  // Step 4: Test the complete regeneration flow as the UI would
  console.log('\n🔄 STEP 4: Testing complete regeneration flow...');
  console.log('This simulates what happens when user clicks "Regenerate Transcript"');
  
  // First, clear any cached formatted transcript
  console.log('Clearing formatted transcript from cache...');
  
  // Then regenerate with formatting
  const regenerateResponse = await fetch('http://localhost:3004/api/youtube/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: videoUrl,
      provider: 'supadata',
      forceRegenerate: true
    })
  });
  
  const regenerateData = await regenerateResponse.json();
  
  if (regenerateData.success) {
    console.log('✅ Regeneration successful');
    console.log('📊 Result:', {
      segments: regenerateData.transcript.length,
      formattedSegments: regenerateData.formattedTranscript?.length || 0,
      hasMetadata: !!regenerateData.videoMetadata,
      hasFormattedTranscript: !!regenerateData.formattedTranscript,
      hasFormattedVersion: regenerateData.hasFormattedVersion
    });
    
    if (regenerateData.formattedTranscript) {
      console.log('\n📋 First 5 formatted segments from extraction:');
      regenerateData.formattedTranscript.slice(0, 5).forEach((seg, i) => {
        console.log(`  ${i + 1}. ${seg.text}`);
      });
    }
  } else {
    console.error('❌ Regeneration failed:', regenerateData.error);
  }
  
  console.log('\n' + '='*60);
  console.log('🏁 Test complete!');
}

// Run the test
testTranscriptFlow().catch(console.error);