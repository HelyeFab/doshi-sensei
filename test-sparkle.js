// Test script to check what's happening with the Sparkle video
// Run with: node test-sparkle.js

const SPARKLE_URL = 'https://www.youtube.com/watch?v=VlXPXvsoWcY'; // Replace with actual Sparkle video ID

async function testSparkleExtraction() {
  console.log('Testing Sparkle video extraction...');
  
  try {
    const response = await fetch('http://localhost:3000/api/youtube/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: SPARKLE_URL })
    });

    if (!response.ok) {
      console.error('Error response:', response.status);
      const error = await response.text();
      console.error('Error details:', error);
      return;
    }

    const data = await response.json();
    
    console.log('\n=== Extraction Results ===');
    console.log('Success:', data.success);
    console.log('Method used:', data.method);
    console.log('Language:', data.language);
    console.log('Video title:', data.videoTitle);
    console.log('Transcript lines:', data.transcript?.length || 0);
    
    if (data.transcript && data.transcript.length > 0) {
      console.log('\n=== First 10 lines of transcript ===');
      data.transcript.slice(0, 10).forEach((line, i) => {
        console.log(`[${i+1}] ${line.text} (${line.text.length} chars)`);
      });
      
      console.log('\n=== Transcript Stats ===');
      const totalChars = data.transcript.reduce((sum, line) => sum + line.text.length, 0);
      const avgLength = totalChars / data.transcript.length;
      console.log('Total lines:', data.transcript.length);
      console.log('Total characters:', totalChars);
      console.log('Average line length:', avgLength.toFixed(1), 'chars');
      
      // Check for formatted version
      console.log('\n=== AI Formatting ===');
      console.log('Has formatted version:', data.hasFormattedVersion);
      console.log('Formatted transcript lines:', data.formattedTranscript?.length || 0);
      
      if (data.formattedTranscript && data.formattedTranscript.length > 0) {
        console.log('\n=== First 10 lines of FORMATTED transcript ===');
        data.formattedTranscript.slice(0, 10).forEach((line, i) => {
          console.log(`[${i+1}] ${line.text} (${line.text.length} chars)`);
        });
      }
    }
    
  } catch (error) {
    console.error('Failed to test extraction:', error);
  }
}

// Run the test
testSparkleExtraction();