// Quick test script for OAuth functionality
// Run with: node test-oauth.js

async function testOAuth() {
  const baseUrl = 'http://localhost:3002';
  
  console.log('Testing OAuth endpoints...\n');
  
  // Test 1: Check if NextAuth is configured
  try {
    const response = await fetch(`${baseUrl}/api/auth/providers`);
    const providers = await response.json();
    console.log('✅ NextAuth providers:', providers);
    
    if (providers.google) {
      console.log('✅ Google OAuth provider is configured');
    } else {
      console.log('❌ Google OAuth provider not found');
    }
  } catch (error) {
    console.log('❌ NextAuth not accessible:', error.message);
  }
  
  // Test 2: Check session endpoint
  try {
    const response = await fetch(`${baseUrl}/api/auth/session`);
    const session = await response.json();
    console.log('\n📝 Current session:', session);
    
    if (session.user) {
      console.log('✅ User is authenticated');
    } else {
      console.log('ℹ️ No active session (need to sign in)');
    }
  } catch (error) {
    console.log('❌ Session check failed:', error.message);
  }
  
  console.log('\n🔗 To test OAuth flow, visit:');
  console.log(`   ${baseUrl}/settings`);
  console.log('   Then click "Connect YouTube Account"');
}

testOAuth();