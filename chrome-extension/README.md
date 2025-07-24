# Doshi Sensei YouTube Helper Extension

A Chrome extension that extracts captions directly from YouTube pages, bypassing server-side blocking issues.

## Features

- Extract Japanese captions from YouTube videos
- Works with both manual and auto-generated captions
- Direct integration with Doshi Sensei web app
- No server blocking issues

## Installation

### For Development

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder
5. Note the extension ID that appears (you'll need this)

### For Users

1. Download the extension files
2. Follow the development installation steps above
3. The extension icon will appear in your browser toolbar

## Usage

### Method 1: Extension Popup
1. Navigate to a YouTube video
2. Click the Doshi Sensei extension icon
3. Click "Extract Captions"
4. If Japanese captions are found, they'll automatically open in Doshi Sensei

### Method 2: From Doshi Sensei
1. Paste a YouTube URL in Doshi Sensei
2. If the extension is installed, it will automatically try to extract captions
3. No manual steps required!

## How It Works

The extension uses YouTube's internal player API to access caption data directly from the page. This bypasses all server-side restrictions because:

1. It runs in the user's browser context
2. Has the same access as a regular YouTube viewer
3. Doesn't make requests from cloud server IPs

## Technical Details

- **Manifest V3** compatible
- Uses content scripts to access YouTube player data
- Communicates with Doshi Sensei via Chrome storage API
- No external dependencies

## Privacy

- The extension only runs on YouTube.com
- No data is sent to external servers
- Captions are stored temporarily in browser storage
- All processing happens locally

## Troubleshooting

### Extension not detected
1. Make sure the extension is enabled in Chrome
2. Refresh both YouTube and Doshi Sensei pages
3. Check that you're on a YouTube video page (not homepage)

### No captions found
1. Check if the video has Japanese captions on YouTube
2. Try enabling auto-generated captions in YouTube player
3. Some videos may not have any captions available

## Development

To modify the extension:

1. Edit the files in this directory
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes

## Files

- `manifest.json` - Extension configuration
- `content.js` - Runs on YouTube pages to extract captions
- `background.js` - Handles communication between pages
- `popup.html/js` - Extension popup interface
- `icon*.png` - Extension icons (to be added)