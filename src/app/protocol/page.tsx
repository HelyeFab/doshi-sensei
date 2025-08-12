'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProtocolHandlerPage() {
  const router = useRouter();

  useEffect(() => {
    // Handle custom protocol URLs like:
    // web+doshisensei://vocabulary/add?word=本&meaning=book
    // web+doshisensei://practice/drill?type=conjugation&level=n3
    // web+doshisensei://share?text=Japanese%20text%20here
    
    const handleProtocol = () => {
      const params = new URLSearchParams(window.location.search);
      const url = params.get('url');
      
      if (!url) {
        router.push('/');
        return;
      }
      
      // Parse the custom protocol URL
      try {
        // Remove the protocol prefix
        const cleanUrl = url.replace('web+doshisensei://', '');
        const [path, queryString] = cleanUrl.split('?');
        const pathParts = path.split('/');
        
        // Route based on the path
        switch (pathParts[0]) {
          case 'vocabulary':
            handleVocabularyProtocol(pathParts, queryString);
            break;
          
          case 'practice':
            handlePracticeProtocol(pathParts, queryString);
            break;
          
          case 'share':
            handleShareProtocol(queryString);
            break;
          
          case 'game':
            handleGameProtocol(pathParts, queryString);
            break;
          
          case 'lesson':
            handleLessonProtocol(pathParts, queryString);
            break;
          
          default:
            // Unknown protocol path, go to home
            router.push('/');
        }
      } catch (error) {
        console.error('Error parsing protocol URL:', error);
        router.push('/');
      }
    };
    
    handleProtocol();
  }, [router]);

  const handleVocabularyProtocol = (pathParts: string[], queryString: string | undefined) => {
    const params = new URLSearchParams(queryString || '');
    const action = pathParts[1];
    
    if (action === 'add') {
      // Add a word to vocabulary
      const word = params.get('word');
      const meaning = params.get('meaning');
      const reading = params.get('reading');
      
      if (word) {
        const vocabulary = JSON.parse(localStorage.getItem('protocol_vocabulary') || '[]');
        vocabulary.push({
          japanese: word,
          meaning: meaning || '',
          reading: reading || '',
          source: 'protocol',
          addedAt: new Date().toISOString()
        });
        localStorage.setItem('protocol_vocabulary', JSON.stringify(vocabulary));
      }
      
      router.push('/vocabulary?source=protocol');
    } else if (action === 'search') {
      const query = params.get('q');
      router.push(`/vocabulary?search=${encodeURIComponent(query || '')}`);
    } else {
      router.push('/vocabulary');
    }
  };

  const handlePracticeProtocol = (pathParts: string[], queryString: string | undefined) => {
    const params = new URLSearchParams(queryString || '');
    const action = pathParts[1];
    
    if (action === 'drill') {
      const type = params.get('type');
      const level = params.get('level');
      router.push(`/drill?type=${type || 'conjugation'}&level=${level || 'n5'}`);
    } else if (action === 'shadowing') {
      const url = params.get('url');
      if (url) {
        router.push(`/tools/youtube-shadowing?url=${encodeURIComponent(url)}`);
      } else {
        router.push('/tools/youtube-shadowing');
      }
    } else {
      router.push('/drill');
    }
  };

  const handleShareProtocol = (queryString: string | undefined) => {
    const params = new URLSearchParams(queryString || '');
    const text = params.get('text');
    const url = params.get('url');
    
    if (text || url) {
      // Redirect to share handler with the data
      const shareParams = new URLSearchParams();
      if (text) shareParams.set('text', text);
      if (url) shareParams.set('url', url);
      
      router.push(`/share?${shareParams.toString()}`);
    } else {
      router.push('/');
    }
  };

  const handleGameProtocol = (pathParts: string[], queryString: string | undefined) => {
    const params = new URLSearchParams(queryString || '');
    const gameType = pathParts[1];
    
    if (gameType) {
      router.push(`/games?game=${gameType}`);
    } else {
      router.push('/games');
    }
  };

  const handleLessonProtocol = (pathParts: string[], queryString: string | undefined) => {
    const params = new URLSearchParams(queryString || '');
    const lessonId = pathParts[1];
    
    if (lessonId) {
      router.push(`/lessons/${lessonId}`);
    } else {
      const level = params.get('level');
      if (level) {
        router.push(`/lessons?level=${level}`);
      } else {
        router.push('/lessons');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Opening Doshi Sensei...</h2>
          <p className="mt-2 text-sm text-gray-600">Processing deep link...</p>
        </div>
      </div>
    </div>
  );
}