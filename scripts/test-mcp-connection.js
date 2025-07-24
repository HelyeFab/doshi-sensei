// Test script to verify MCP server connection and get sample data
// Run with: node scripts/test-mcp-connection.js

const MCP_BASE_URL = 'http://localhost:8080/api';

async function testMCPConnection() {
  console.log('🔌 Testing MCP server connection...\n');
  
  try {
    // Test 1: Get deck info
    console.log('📊 Fetching deck information...');
    const deckInfoResponse = await fetch(`${MCP_BASE_URL}/get_deck_info`);
    
    if (!deckInfoResponse.ok) {
      throw new Error(`HTTP error! status: ${deckInfoResponse.status}`);
    }
    
    const deckInfo = await deckInfoResponse.json();
    console.log('✅ Deck info retrieved successfully!');
    console.log('Available decks:', JSON.stringify(deckInfo, null, 2));
    
    // Test 2: Get sample cards from Genki 1
    console.log('\n📚 Fetching sample Genki 1 vocabulary...');
    const genki1Response = await fetch(`${MCP_BASE_URL}/get_cards?deck=Genki%201&limit=5`);
    
    if (!genki1Response.ok) {
      throw new Error(`HTTP error! status: ${genki1Response.status}`);
    }
    
    const genki1Cards = await genki1Response.json();
    console.log('✅ Sample cards retrieved!');
    console.log(`Found ${genki1Cards.length} cards. First card:`, JSON.stringify(genki1Cards[0], null, 2));
    
    // Test 3: Get JLPT vocabulary
    console.log('\n🎯 Fetching N5 vocabulary...');
    const n5Response = await fetch(`${MCP_BASE_URL}/get_jlpt_vocabulary?level=N5&limit=5`);
    
    if (!n5Response.ok) {
      throw new Error(`HTTP error! status: ${n5Response.status}`);
    }
    
    const n5Cards = await n5Response.json();
    console.log('✅ JLPT N5 vocabulary retrieved!');
    console.log(`Found ${n5Cards.length} N5 cards`);
    
    // Test 4: Search functionality
    console.log('\n🔍 Testing search for "たべる"...');
    const searchResponse = await fetch(`${MCP_BASE_URL}/search_vocabulary?query=たべる`);
    
    if (!searchResponse.ok) {
      throw new Error(`HTTP error! status: ${searchResponse.status}`);
    }
    
    const searchResults = await searchResponse.json();
    console.log('✅ Search completed!');
    console.log(`Found ${searchResults.length} results for "たべる"`);
    
    console.log('\n🎉 All tests passed! MCP server is working correctly.');
    console.log('\n📝 Next steps:');
    console.log('1. Create the data directory: mkdir -p src/data/textbook-vocabulary');
    console.log('2. Run the full import script to generate static JSON files');
    console.log('3. The vocabulary data will be available offline in your project');
    
  } catch (error) {
    console.error('❌ Error connecting to MCP server:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Make sure the MCP server is running: cd /home/mate/Dev/MCPs/anki-word-generator && python src/http_server.py');
    console.error('2. Check that port 8080 is not blocked');
    console.error('3. Verify the server URL is correct: http://localhost:8080');
  }
}

// Run the test
testMCPConnection();