// Background service worker for the extension

// Handle installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Doshi Sensei YouTube Helper installed');
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openDoshiSensei') {
    // Open Doshi Sensei with the video URL
    const doshiSenseiUrl = `http://localhost:3000/tools/youtube-shadowing?url=${encodeURIComponent(request.url)}`;
    chrome.tabs.create({ url: doshiSenseiUrl });
  }
});

// Allow web pages to check if extension is installed
chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    if (request.action === 'ping') {
      sendResponse({ installed: true, version: chrome.runtime.getManifest().version });
    } else if (request.action === 'extractCaptions' && request.tabId) {
      // Forward the request to the content script in the specified tab
      chrome.tabs.sendMessage(request.tabId, { action: 'extractCaptions' }, (response) => {
        sendResponse(response);
      });
      return true; // Keep the message channel open
    }
  }
);