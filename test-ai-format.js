// Test script for AI transcript formatting
// Run with: node test-ai-format.js

async function testAIFormatting() {
  const testTranscript = [
    {
      id: "1",
      text: "まだこの世界は僕を飼いならしてたいみたいだ望み通りだろう僕を飼いならしてたいみたいだ",
      startTime: 0,
      endTime: 10,
      words: []
    },
    {
      id: "2", 
      text: "この長い文章はとても読みにくいです特に日本語学習者にとっては文の区切りがわかりにくいのでシャドーイング練習が難しくなります",
      startTime: 10,
      endTime: 20,
      words: []
    }
  ];

  console.log('Testing AI transcript formatting...');
  console.log('Original transcript:');
  testTranscript.forEach(line => {
    console.log(`  [${line.id}] ${line.text} (${line.text.length} chars)`);
  });

  try {
    const response = await fetch('http://localhost:3000/api/ai/format-transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: testTranscript,
        videoTitle: 'Test Video',
        language: 'ja'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Error from API:', error);
      return;
    }

    const data = await response.json();
    
    if (data.formattedTranscript) {
      console.log('\nFormatted transcript:');
      data.formattedTranscript.forEach(line => {
        console.log(`  [${line.id}] ${line.text} (${line.text.length} chars)`);
        console.log(`        Time: ${line.startTime.toFixed(2)}s - ${line.endTime.toFixed(2)}s`);
      });
      
      if (data.stats) {
        console.log('\nStats:');
        console.log(`  Original lines: ${data.stats.originalLines}`);
        console.log(`  Formatted lines: ${data.stats.formattedLines}`);
        console.log(`  Avg original length: ${data.stats.avgOriginalLength} chars`);
        console.log(`  Avg formatted length: ${data.stats.avgFormattedLength} chars`);
      }
    } else {
      console.log('No formatted transcript returned');
    }
  } catch (error) {
    console.error('Failed to test formatting:', error);
  }
}

// Run the test
testAIFormatting();