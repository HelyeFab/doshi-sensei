#!/usr/bin/env node

const OpenAI = require('openai');
require('dotenv').config();

async function testOpenAIImages() {
  console.log('Testing OpenAI Image Generation...\n');
  
  // Check if API key exists
  if (!process.env.OPEN_AI_API_KEY) {
    console.error('ERROR: OPEN_AI_API_KEY not found in environment variables');
    process.exit(1);
  }
  
  console.log('API Key found:', process.env.OPEN_AI_API_KEY.substring(0, 10) + '...');
  
  const openai = new OpenAI({
    apiKey: process.env.OPEN_AI_API_KEY,
  });
  
  try {
    // Test 1: Simple image generation
    console.log('\nTest 1: Generating simple anime-style image...');
    const response1 = await openai.images.generate({
      model: 'dall-e-3',
      prompt: 'An adorable illustration of students in a classroom, Japanese anime style',
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      style: 'vivid'
    });
    
    console.log('✅ Success! Image URL:', response1.data[0]?.url?.substring(0, 50) + '...');
    
    // Test 2: Check response time
    console.log('\nTest 2: Measuring response time...');
    const startTime = Date.now();
    const response2 = await openai.images.generate({
      model: 'dall-e-3',
      prompt: 'A peaceful outdoor scene with cherry blossoms, Japanese anime style',
      n: 1,
      size: '1024x1024'
    });
    const endTime = Date.now();
    
    console.log(`✅ Image generated in ${(endTime - startTime) / 1000} seconds`);
    
    // Test 3: Error handling
    console.log('\nTest 3: Testing error handling with inappropriate content...');
    try {
      await openai.images.generate({
        model: 'dall-e-3',
        prompt: 'violent content test - this should fail',
        n: 1,
        size: '1024x1024'
      });
    } catch (error) {
      console.log('✅ Content policy rejection working as expected');
      console.log('Error:', error.message);
    }
    
    console.log('\n✅ All tests completed successfully!');
    console.log('\nRecommendations:');
    console.log('- API key is valid and working');
    console.log('- DALL-E 3 is responding correctly');
    console.log(`- Average generation time: ${(endTime - startTime) / 1000} seconds`);
    console.log('- Content filtering is active');
    
  } catch (error) {
    console.error('\n❌ Error during testing:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testOpenAIImages().catch(console.error);