// Comprehensive test for YouTube Shadowing caching system
// Run with: npx tsx test-youtube-shadowing.ts

import { TranscriptCacheManager } from './src/utils/transcriptCache';

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Test data
const testCases = {
  // YouTube video test cases
  youtube: [
    {
      name: 'Standard YouTube URL',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      expectedId: 'youtube_dQw4w9WgXcQ'
    },
    {
      name: 'Short YouTube URL',
      url: 'https://youtu.be/dQw4w9WgXcQ',
      expectedId: 'youtube_dQw4w9WgXcQ'
    },
    {
      name: 'YouTube URL with timestamp',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s',
      expectedId: 'youtube_dQw4w9WgXcQ'
    },
    {
      name: 'YouTube URL with playlist',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf',
      expectedId: 'youtube_dQw4w9WgXcQ'
    },
    {
      name: 'YouTube Shorts URL',
      url: 'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      expectedId: 'youtube_dQw4w9WgXcQ'
    },
    {
      name: 'YouTube Music URL',
      url: 'https://music.youtube.com/watch?v=dQw4w9WgXcQ',
      expectedId: 'youtube_dQw4w9WgXcQ'
    }
  ],
  
  // Audio file test cases
  audio: [
    {
      name: 'MP3 Audio File',
      fileName: 'japanese-lesson-1.mp3',
      fileSize: 5242880, // 5MB
      fileType: 'audio/mpeg',
      expectedPattern: /^file_[a-f0-9]+$/
    },
    {
      name: 'Same MP3 (should get same ID)',
      fileName: 'japanese-lesson-1.mp3',
      fileSize: 5242880, // Same size
      fileType: 'audio/mpeg',
      expectedPattern: /^file_[a-f0-9]+$/,
      shouldMatchPrevious: true
    },
    {
      name: 'Different MP3 (different name)',
      fileName: 'japanese-lesson-2.mp3',
      fileSize: 5242880, // Same size but different name
      fileType: 'audio/mpeg',
      expectedPattern: /^file_[a-f0-9]+$/,
      shouldNotMatchPrevious: true
    },
    {
      name: 'WAV Audio File',
      fileName: 'recording.wav',
      fileSize: 10485760, // 10MB
      fileType: 'audio/wav',
      expectedPattern: /^file_[a-f0-9]+$/
    },
    {
      name: 'M4A Audio File',
      fileName: 'podcast.m4a',
      fileSize: 7340032, // ~7MB
      fileType: 'audio/m4a',
      expectedPattern: /^file_[a-f0-9]+$/
    }
  ],
  
  // Video file test cases
  video: [
    {
      name: 'MP4 Video File',
      fileName: 'japanese-drama-ep1.mp4',
      fileSize: 104857600, // 100MB
      fileType: 'video/mp4',
      expectedPattern: /^file_[a-f0-9]+$/
    },
    {
      name: 'Same MP4 (should get same ID)',
      fileName: 'japanese-drama-ep1.mp4',
      fileSize: 104857600, // Same file
      fileType: 'video/mp4',
      expectedPattern: /^file_[a-f0-9]+$/,
      shouldMatchPrevious: true
    },
    {
      name: 'WebM Video File',
      fileName: 'lecture.webm',
      fileSize: 52428800, // 50MB
      fileType: 'video/webm',
      expectedPattern: /^file_[a-f0-9]+$/
    }
  ]
};

// Mock transcript data
const mockTranscript = [
  {
    id: '1',
    text: 'これはテストです。',
    startTime: 0,
    endTime: 3,
    words: ['これは', 'テスト', 'です']
  },
  {
    id: '2',
    text: 'キャッシュシステムが正しく動作することを確認しています。',
    startTime: 3,
    endTime: 7,
    words: ['キャッシュ', 'システムが', '正しく', '動作する', 'ことを', '確認', 'しています']
  }
];

// Test runner
async function runTests() {
  console.log(`${colors.bright}${colors.cyan}🧪 YouTube Shadowing Cache System Test${colors.reset}\n`);
  console.log('='.repeat(60) + '\n');
  
  const results = {
    passed: 0,
    failed: 0,
    errors: [] as string[]
  };
  
  // Test 1: YouTube URL content ID generation
  console.log(`${colors.bright}${colors.yellow}📺 Testing YouTube URL Processing${colors.reset}`);
  console.log('-'.repeat(40));
  
  for (const testCase of testCases.youtube) {
    try {
      const contentId = TranscriptCacheManager.generateContentId({
        type: 'youtube',
        videoUrl: testCase.url
      });
      
      if (contentId === testCase.expectedId) {
        console.log(`${colors.green}✓${colors.reset} ${testCase.name}`);
        console.log(`  URL: ${testCase.url}`);
        console.log(`  Generated ID: ${contentId}`);
        results.passed++;
      } else {
        console.log(`${colors.red}✗${colors.reset} ${testCase.name}`);
        console.log(`  Expected: ${testCase.expectedId}`);
        console.log(`  Got: ${contentId}`);
        results.failed++;
        results.errors.push(`${testCase.name}: Expected ${testCase.expectedId}, got ${contentId}`);
      }
    } catch (error: any) {
      console.log(`${colors.red}🔥${colors.reset} ${testCase.name}: ${error.message}`);
      results.failed++;
      results.errors.push(`${testCase.name}: ${error.message}`);
    }
    console.log();
  }
  
  // Test 2: Audio file content ID generation
  console.log(`\n${colors.bright}${colors.yellow}🎵 Testing Audio File Processing${colors.reset}`);
  console.log('-'.repeat(40));
  
  let previousAudioId = '';
  for (const testCase of testCases.audio) {
    try {
      const contentId = TranscriptCacheManager.generateContentId({
        type: 'audio',
        fileName: testCase.fileName,
        fileSize: testCase.fileSize
      });
      
      const matchesPattern = testCase.expectedPattern.test(contentId);
      let testPassed = matchesPattern;
      
      // Check if it should match previous
      if (testCase.shouldMatchPrevious) {
        testPassed = testPassed && (contentId === previousAudioId);
        if (contentId === previousAudioId) {
          console.log(`${colors.green}✓${colors.reset} ${testCase.name} - Correctly generated same ID`);
        } else {
          console.log(`${colors.red}✗${colors.reset} ${testCase.name} - Should have matched previous ID`);
          results.errors.push(`${testCase.name}: Should have matched previous ID`);
        }
      } else if (testCase.shouldNotMatchPrevious) {
        testPassed = testPassed && (contentId !== previousAudioId);
        if (contentId !== previousAudioId) {
          console.log(`${colors.green}✓${colors.reset} ${testCase.name} - Correctly generated different ID`);
        } else {
          console.log(`${colors.red}✗${colors.reset} ${testCase.name} - Should NOT have matched previous ID`);
          results.errors.push(`${testCase.name}: Should NOT have matched previous ID`);
        }
      } else if (matchesPattern) {
        console.log(`${colors.green}✓${colors.reset} ${testCase.name}`);
      } else {
        console.log(`${colors.red}✗${colors.reset} ${testCase.name}`);
        results.errors.push(`${testCase.name}: Invalid content ID format`);
      }
      
      console.log(`  File: ${testCase.fileName} (${(testCase.fileSize / 1024 / 1024).toFixed(2)}MB)`);
      console.log(`  Generated ID: ${contentId}`);
      
      if (testPassed) {
        results.passed++;
      } else {
        results.failed++;
      }
      
      // Store for next comparison
      if (!testCase.shouldNotMatchPrevious) {
        previousAudioId = contentId;
      }
    } catch (error: any) {
      console.log(`${colors.red}🔥${colors.reset} ${testCase.name}: ${error.message}`);
      results.failed++;
      results.errors.push(`${testCase.name}: ${error.message}`);
    }
    console.log();
  }
  
  // Test 3: Video file content ID generation
  console.log(`\n${colors.bright}${colors.yellow}🎬 Testing Video File Processing${colors.reset}`);
  console.log('-'.repeat(40));
  
  let previousVideoId = '';
  for (const testCase of testCases.video) {
    try {
      const contentId = TranscriptCacheManager.generateContentId({
        type: 'video',
        fileName: testCase.fileName,
        fileSize: testCase.fileSize
      });
      
      const matchesPattern = testCase.expectedPattern.test(contentId);
      let testPassed = matchesPattern;
      
      // Check if it should match previous
      if (testCase.shouldMatchPrevious) {
        testPassed = testPassed && (contentId === previousVideoId);
        if (contentId === previousVideoId) {
          console.log(`${colors.green}✓${colors.reset} ${testCase.name} - Correctly generated same ID`);
        } else {
          console.log(`${colors.red}✗${colors.reset} ${testCase.name} - Should have matched previous ID`);
          results.errors.push(`${testCase.name}: Should have matched previous ID`);
        }
      } else if (matchesPattern) {
        console.log(`${colors.green}✓${colors.reset} ${testCase.name}`);
      } else {
        console.log(`${colors.red}✗${colors.reset} ${testCase.name}`);
        results.errors.push(`${testCase.name}: Invalid content ID format`);
      }
      
      console.log(`  File: ${testCase.fileName} (${(testCase.fileSize / 1024 / 1024).toFixed(2)}MB)`);
      console.log(`  Generated ID: ${contentId}`);
      
      if (testPassed) {
        results.passed++;
      } else {
        results.failed++;
      }
      
      // Store for next comparison
      previousVideoId = contentId;
    } catch (error: any) {
      console.log(`${colors.red}🔥${colors.reset} ${testCase.name}: ${error.message}`);
      results.failed++;
      results.errors.push(`${testCase.name}: ${error.message}`);
    }
    console.log();
  }
  
  // Test 4: Cache consistency test
  console.log(`\n${colors.bright}${colors.yellow}🔄 Testing Cache Consistency${colors.reset}`);
  console.log('-'.repeat(40));
  
  // Test that the same content always generates the same ID
  const testFile = {
    fileName: 'test-audio.mp3',
    fileSize: 1048576 // 1MB
  };
  
  const ids = [];
  for (let i = 0; i < 5; i++) {
    const id = TranscriptCacheManager.generateContentId({
      type: 'audio',
      fileName: testFile.fileName,
      fileSize: testFile.fileSize
    });
    ids.push(id);
  }
  
  const allSame = ids.every(id => id === ids[0]);
  if (allSame) {
    console.log(`${colors.green}✓${colors.reset} Same file generates consistent ID across multiple calls`);
    console.log(`  Generated ID: ${ids[0]} (5 times)`);
    results.passed++;
  } else {
    console.log(`${colors.red}✗${colors.reset} Inconsistent IDs generated for same file`);
    console.log(`  IDs: ${ids.join(', ')}`);
    results.failed++;
    results.errors.push('Cache consistency test failed');
  }
  
  // Test 5: Edge cases
  console.log(`\n${colors.bright}${colors.yellow}⚠️ Testing Edge Cases${colors.reset}`);
  console.log('-'.repeat(40));
  
  // Test with special characters in filename
  try {
    const specialId = TranscriptCacheManager.generateContentId({
      type: 'audio',
      fileName: '日本語のファイル名.mp3',
      fileSize: 2097152
    });
    console.log(`${colors.green}✓${colors.reset} Handles Japanese filename`);
    console.log(`  File: 日本語のファイル名.mp3`);
    console.log(`  Generated ID: ${specialId}`);
    results.passed++;
  } catch (error: any) {
    console.log(`${colors.red}✗${colors.reset} Failed with Japanese filename: ${error.message}`);
    results.failed++;
  }
  
  // Test with very long filename
  try {
    const longName = 'very_long_filename_'.repeat(20) + '.mp3';
    const longId = TranscriptCacheManager.generateContentId({
      type: 'audio',
      fileName: longName,
      fileSize: 3145728
    });
    console.log(`${colors.green}✓${colors.reset} Handles very long filename`);
    console.log(`  Generated ID: ${longId}`);
    results.passed++;
  } catch (error: any) {
    console.log(`${colors.red}✗${colors.reset} Failed with long filename: ${error.message}`);
    results.failed++;
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.bright}📊 TEST SUMMARY${colors.reset}`);
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  
  const successRate = (results.passed / (results.passed + results.failed) * 100).toFixed(1);
  const rateColor = results.failed === 0 ? colors.green : results.failed < 3 ? colors.yellow : colors.red;
  console.log(`${rateColor}Success Rate: ${successRate}%${colors.reset}\n`);
  
  if (results.errors.length > 0) {
    console.log(`${colors.red}${colors.bright}Failed Tests:${colors.reset}`);
    results.errors.forEach(error => console.log(`  ${colors.red}• ${error}${colors.reset}`));
  } else {
    console.log(`${colors.green}${colors.bright}✨ All tests passed!${colors.reset}`);
  }
  
  // Test 6: Simulated real-world scenario
  console.log(`\n${colors.bright}${colors.yellow}🌍 Real-World Scenario Test${colors.reset}`);
  console.log('='.repeat(60));
  console.log('Simulating: User uploads same audio file multiple times\n');
  
  const audioFile = {
    name: 'japanese-podcast-episode-1.mp3',
    size: 8388608, // 8MB
    type: 'audio/mpeg'
  };
  
  console.log(`File: ${audioFile.name} (${(audioFile.size / 1024 / 1024).toFixed(2)}MB)`);
  console.log(`Type: ${audioFile.type}\n`);
  
  // First upload
  console.log('1️⃣ First upload by User A:');
  const firstId = TranscriptCacheManager.generateContentId({
    type: 'audio',
    fileName: audioFile.name,
    fileSize: audioFile.size
  });
  console.log(`   Generated Content ID: ${firstId}`);
  console.log(`   ${colors.yellow}→ Would call OpenAI Whisper API (costs money)${colors.reset}`);
  console.log(`   ${colors.green}→ Transcript saved to cache${colors.reset}\n`);
  
  // Second upload (same user)
  console.log('2️⃣ Second upload by User A (same file):');
  const secondId = TranscriptCacheManager.generateContentId({
    type: 'audio',
    fileName: audioFile.name,
    fileSize: audioFile.size
  });
  console.log(`   Generated Content ID: ${secondId}`);
  console.log(`   ID matches cache: ${secondId === firstId ? colors.green + 'YES' : colors.red + 'NO'}${colors.reset}`);
  if (secondId === firstId) {
    console.log(`   ${colors.green}✓ Cache hit! No API call needed${colors.reset}`);
    console.log(`   ${colors.cyan}→ Returns cached transcript instantly${colors.reset}\n`);
  } else {
    console.log(`   ${colors.red}✗ Cache miss - would make unnecessary API call${colors.reset}\n`);
  }
  
  // Third upload (different user)
  console.log('3️⃣ Upload by User B (same file):');
  const thirdId = TranscriptCacheManager.generateContentId({
    type: 'audio',
    fileName: audioFile.name,
    fileSize: audioFile.size
  });
  console.log(`   Generated Content ID: ${thirdId}`);
  console.log(`   ID matches cache: ${thirdId === firstId ? colors.green + 'YES' : colors.red + 'NO'}${colors.reset}`);
  if (thirdId === firstId) {
    console.log(`   ${colors.green}✓ Cache hit! Shared community benefit${colors.reset}`);
    console.log(`   ${colors.cyan}→ User B benefits from User A's upload${colors.reset}\n`);
  } else {
    console.log(`   ${colors.red}✗ Cache miss - would duplicate processing${colors.reset}\n`);
  }
  
  // Different file test
  console.log('4️⃣ Upload different file:');
  const differentId = TranscriptCacheManager.generateContentId({
    type: 'audio',
    fileName: 'japanese-podcast-episode-2.mp3', // Different name
    fileSize: audioFile.size // Same size
  });
  console.log(`   File: japanese-podcast-episode-2.mp3`);
  console.log(`   Generated Content ID: ${differentId}`);
  console.log(`   ID matches previous: ${differentId === firstId ? colors.red + 'YES (BAD!)' : colors.green + 'NO (GOOD!)'}${colors.reset}`);
  if (differentId !== firstId) {
    console.log(`   ${colors.green}✓ Correctly identified as different content${colors.reset}`);
    console.log(`   ${colors.yellow}→ Would call OpenAI API for new content${colors.reset}\n`);
  } else {
    console.log(`   ${colors.red}✗ ERROR: Same ID for different content!${colors.reset}\n`);
  }
  
  console.log('='.repeat(60));
  console.log(`${colors.bright}${colors.cyan}🎯 CONCLUSION${colors.reset}`);
  console.log('='.repeat(60));
  
  if (results.failed === 0 && secondId === firstId && thirdId === firstId && differentId !== firstId) {
    console.log(`${colors.green}${colors.bright}✅ Cache system is working correctly!${colors.reset}`);
    console.log('\nBenefits achieved:');
    console.log('• Same content always generates same ID');
    console.log('• Duplicate uploads use cached transcripts');
    console.log('• Different content gets unique IDs');
    console.log('• Works across different users');
    console.log('• Saves API calls and processing costs');
  } else {
    console.log(`${colors.red}${colors.bright}⚠️ Issues detected in cache system${colors.reset}`);
    console.log('\nProblems found:');
    if (secondId !== firstId) console.log('• Same file generates different IDs');
    if (differentId === firstId) console.log('• Different files generate same ID');
    if (results.failed > 0) console.log(`• ${results.failed} test(s) failed`);
  }
}

// Run tests
runTests().catch(console.error);