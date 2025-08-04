'use client';

import { useEffect, useState } from 'react';
import { TranscriptLine } from '../YouTubeShadowing';

interface ExtensionConnectorProps {
  videoUrl: string;
  onCaptionsReceived: (transcript: TranscriptLine[]) => void;
  onError: (error: string) => void;
}

export default function ExtensionConnector({ 
  videoUrl, 
  onCaptionsReceived,
  onError 
}: ExtensionConnectorProps) {
  const [extensionDetected, setExtensionDetected] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkExtension();
  }, []);

  const checkExtension = async () => {
    try {
      // Check if extension is installed by trying to access the extension's ID
      // You'll need to get this ID after installing the extension
      const extensionId = 'YOUR_EXTENSION_ID_HERE'; // Replace with actual ID
      
      // @ts-ignore - chrome API is only available in extension context
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        // @ts-ignore
        chrome.runtime.sendMessage(extensionId, { action: 'ping' }, (response: any) => {
          // @ts-ignore
          if (chrome.runtime.lastError) {
            setExtensionDetected(false);
          } else if (response && response.installed) {
            setExtensionDetected(true);
            checkForStoredCaptions();
          }
          setChecking(false);
        });
      } else {
        setExtensionDetected(false);
        setChecking(false);
      }
    } catch (error) {
      // If chrome.runtime is not available, we're not in an extension context
      setExtensionDetected(false);
      setChecking(false);
    }
  };

  const checkForStoredCaptions = () => {
    // Check if the extension has stored captions for this video
    const videoId = extractVideoId(videoUrl);
    
    // @ts-ignore - chrome API is only available in extension context
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      // @ts-ignore
      chrome.storage.local.get(['latestCaptions'], (result: any) => {
      if (result.latestCaptions && 
          result.latestCaptions.videoInfo.videoId === videoId &&
          Date.now() - result.latestCaptions.timestamp < 300000) { // 5 minutes
        
        // Parse the captions
        const transcript = parseCaptions(
          result.latestCaptions.captions,
          result.latestCaptions.language
        );
        
        if (transcript.length > 0) {
          onCaptionsReceived(transcript);
        }
      }
    });
    }
  };

  const extractVideoId = (url: string): string | null => {
    const match = url.match(/[?&]v=([^&]+)/);
    return match ? match[1] : null;
  };

  const parseCaptions = (captionData: string, language: string): TranscriptLine[] => {
    const transcript: TranscriptLine[] = [];
    
    try {
      // Parse XML format (srv3) from YouTube
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(captionData, 'text/xml');
      const textNodes = xmlDoc.getElementsByTagName('text');
      
      Array.from(textNodes).forEach((node, index) => {
        const start = parseFloat(node.getAttribute('start') || '0');
        const duration = parseFloat(node.getAttribute('dur') || '5');
        const text = node.textContent || '';
        
        if (text.trim()) {
          transcript.push({
            id: String(index + 1),
            text: text.trim(),
            startTime: start,
            endTime: start + duration,
            words: text.trim().split(/[\s、。！？]/g).filter(w => w.length > 0)
          });
        }
      });
    } catch (error) {
      console.error('Error parsing captions:', error);
    }
    
    return transcript;
  };

  if (checking) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-blue-800">Checking for Doshi Sensei browser extension...</p>
      </div>
    );
  }

  if (extensionDetected) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-green-800">
            Doshi Sensei extension detected! Checking for captions...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <p className="text-sm text-yellow-800 font-medium mb-2">
            Browser extension not detected
          </p>
          <p className="text-sm text-yellow-700 mb-3">
            Install the Doshi Sensei browser extension to automatically extract YouTube captions without server blocking.
          </p>
          <a 
            href="/chrome-extension/install-instructions"
            target="_blank"
            className="inline-flex items-center gap-2 text-sm text-yellow-800 hover:text-yellow-900 font-medium"
          >
            Install Extension
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}