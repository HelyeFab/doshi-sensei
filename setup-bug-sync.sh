#!/bin/bash

echo "🔧 Doshisensei Bug Sync Setup"
echo "=============================="
echo ""

# Generate a secure API key
API_KEY=$(openssl rand -hex 32)

echo "📝 Generated API Key: $API_KEY"
echo ""
echo "Please add this to your .env.local file:"
echo ""
echo "BUG_SYNC_API_KEY=$API_KEY"
echo ""
echo "----------------------------------------"
echo ""
echo "Next steps:"
echo "1. Add the API key above to your .env.local file"
echo "2. Deploy your changes to production"
echo "3. Open Obsidian and enable the 'Doshisensei Bug Report Sync' plugin"
echo "4. Configure the plugin with:"
echo "   - API Key: $API_KEY"
echo "   - API URL (production): https://doshisensei.com/api/bugs/sync"
echo "   - API URL (local testing): http://localhost:3002/api/bugs/sync"
echo ""
echo "✅ Setup complete!"