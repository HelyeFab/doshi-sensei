'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStrings } from '@/contexts/LanguageContext';

export default function ShareTargetPage() {
  const [sharedData, setSharedData] = useState<any>(null);
  const [processing, setProcessing] = useState(true);
  const router = useRouter();
  const strings = useStrings();

  useEffect(() => {
    // Handle shared data from PWA share target
    const handleSharedData = async () => {
      try {
        // Check URL params for shared data
        const params = new URLSearchParams(window.location.search);
        const title = params.get('title');
        const text = params.get('text');
        const url = params.get('url');

        if (title || text || url) {
          setSharedData({ title, text, url });
          
          // Process the shared content
          if (text && isJapaneseText(text)) {
            // If Japanese text is shared, add it to vocabulary or create a study session
            await processJapaneseText(text);
          } else if (url) {
            // If URL is shared, check if it's a Japanese learning resource
            await processSharedUrl(url);
          }
        }
      } catch (error) {
        console.error('Error processing shared data:', error);
      } finally {
        setProcessing(false);
      }
    };

    handleSharedData();
  }, []);

  const isJapaneseText = (text: string): boolean => {
    // Check if text contains Japanese characters
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
    return japaneseRegex.test(text);
  };

  const processJapaneseText = async (text: string) => {
    // Save to vocabulary for study
    const words = text.split(/[、。\s]+/).filter(word => word.length > 0);
    
    // Store in localStorage for now (could be Firebase later)
    const studyList = JSON.parse(localStorage.getItem('shared_study_list') || '[]');
    studyList.push({
      text,
      words,
      sharedAt: new Date().toISOString(),
      source: 'share'
    });
    localStorage.setItem('shared_study_list', JSON.stringify(studyList));
    
    // Redirect to vocabulary page with the new content
    setTimeout(() => {
      router.push('/vocabulary?source=shared');
    }, 2000);
  };

  const processSharedUrl = async (url: string) => {
    // Check if it's a YouTube URL for shadowing practice
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      router.push(`/tools/youtube-shadowing?url=${encodeURIComponent(url)}`);
      return;
    }
    
    // Check if it's an NHK or Japanese news site
    if (url.includes('nhk.or.jp') || url.includes('asahi.com')) {
      router.push(`/news?import=${encodeURIComponent(url)}`);
      return;
    }
    
    // Default: Save as a resource link
    const resources = JSON.parse(localStorage.getItem('shared_resources') || '[]');
    resources.push({
      url,
      sharedAt: new Date().toISOString()
    });
    localStorage.setItem('shared_resources', JSON.stringify(resources));
    
    setTimeout(() => {
      router.push('/');
    }, 2000);
  };

  if (processing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">Processing shared content...</h2>
            <p className="mt-2 text-sm text-gray-600">We're adding this to your study materials</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Content Saved!</h2>
          {sharedData?.text && isJapaneseText(sharedData.text) && (
            <p className="mt-2 text-sm text-gray-600">Japanese text added to your vocabulary list</p>
          )}
          {sharedData?.url && (
            <p className="mt-2 text-sm text-gray-600">URL saved to your resources</p>
          )}
          <p className="mt-4 text-xs text-gray-500">Redirecting...</p>
        </div>
      </div>
    </div>
  );
}