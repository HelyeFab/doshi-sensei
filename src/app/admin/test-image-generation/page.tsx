'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { useRouter } from 'next/navigation';

export default function TestImageGenerationPage() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const testImageGeneration = async () => {
    if (!user || !isAdmin) return;
    
    setLoading(true);
    setError('');
    setResult(null);
    
    try {
      const token = await user.getIdToken();
      
      // Test the image generation endpoint directly
      const response = await fetch('/api/admin/generate-page-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pageNumber: 1,
          imagePrompt: 'A cheerful classroom scene with students studying Japanese',
          characterDescription: 'Young students in school uniforms',
          visualStyle: 'Cute anime style, bright colors',
          setting: 'Modern Japanese classroom'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Unknown error occurred');
      console.error('Test failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return <div className="p-8">Admin access required</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Test Image Generation</h1>
      
      <button
        onClick={testImageGeneration}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Image Generation'}
      </button>
      
      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <h3 className="font-bold">Error:</h3>
          <p>{error}</p>
        </div>
      )}
      
      {result && (
        <div className="mt-4 space-y-4">
          <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            <h3 className="font-bold">Success!</h3>
            <p>Image generation completed</p>
          </div>
          
          {result.pageImage?.imageUrl && (
            <div>
              <h3 className="font-bold mb-2">Generated Image:</h3>
              <img 
                src={result.pageImage.imageUrl} 
                alt={result.pageImage.imageAlt}
                className="max-w-full rounded shadow-lg"
              />
            </div>
          )}
          
          <div className="p-4 bg-gray-100 rounded">
            <h3 className="font-bold mb-2">Response Data:</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}