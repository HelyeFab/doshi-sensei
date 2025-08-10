#!/usr/bin/env node

// Test script to verify the bug sync API
const API_KEY = 'f864dcdf18250c6ccf8d2d79432ea4215ae5049b84efb92f191c926865f62f33';
const API_URL = 'http://localhost:3003/api/bugs/sync';

async function testAPI() {
  console.log('Testing Bug Sync API...\n');
  console.log('API URL:', API_URL);
  console.log('API Key:', API_KEY.substring(0, 10) + '...' + API_KEY.substring(API_KEY.length - 10));
  console.log('\n-------------------\n');

  try {
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response Status:', response.status);
    console.log('Response Status Text:', response.statusText);
    
    const responseText = await response.text();
    console.log('\nResponse Body:');
    
    try {
      const data = JSON.parse(responseText);
      console.log(JSON.stringify(data, null, 2));
    } catch (e) {
      console.log(responseText);
    }

    if (response.status === 401) {
      console.log('\n❌ Authentication failed!');
      console.log('Possible issues:');
      console.log('1. API key mismatch between .env and the one used');
      console.log('2. Environment variable not loaded in Next.js');
      console.log('3. Next.js server needs restart after .env changes');
    } else if (response.status === 200) {
      console.log('\n✅ API authentication successful!');
    }
  } catch (error) {
    console.error('Error testing API:', error);
    console.log('\nMake sure the Next.js dev server is running on port 3000');
  }
}

testAPI();