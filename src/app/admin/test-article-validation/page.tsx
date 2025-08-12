'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function TestArticleValidation() {
  const { user } = useAuth();
  const [articleId, setArticleId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if user is admin
  const isAdmin = user?.email === 'emmanuelfabiani23@gmail.com';

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p className="font-bold">Access Denied</p>
            <p>This page is only accessible to administrators.</p>
          </div>
        </div>
      </div>
    );
  }

  const testSingleArticle = async () => {
    if (!articleId) {
      setError('Please enter an article ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/test-article-validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          articleId,
          forceReprocess: true 
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process article');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testBatchProcessing = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/test-article-validation');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to trigger batch processing');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testValidationAPI = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const testContent = `
        これは日本語のテスト記事です。AIバリデーションシステムが正しく動作しているかを確認します。
        
        まず、この記事は日本語学習者向けに書かれています。文法と語彙のレベルはN3程度を想定しています。
        
        記事の内容は以下の通りです：
        1. AIによる品質スコアリング
        2. JLPTレベルの自動検出
        3. コンテンツの構造分析
        
        最後に、このシステムは記事の品質を向上させ、学習者により良い体験を提供することを目的としています。
      `;

      const response = await fetch('/api/ai/validate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'テスト記事 - AIバリデーション',
          content: testContent,
          source: 'test',
          currentJlptLevel: 'N3'
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to validate test article');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testCoverGeneration = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/ai/generate-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '日本の伝統文化：茶道の世界',
          keywords: ['tea ceremony', 'Japanese culture', 'tradition', 'zen'],
          preferDallE: false
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate cover');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Article AI Validation Test Page
        </h1>

        <div className="space-y-6">
          {/* Test Single Article */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Test Single Article</h2>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Enter article ID"
                value={articleId}
                onChange={(e) => setArticleId(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={testSingleArticle}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Process Article'}
              </button>
            </div>
          </div>

          {/* Test Batch Processing */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Test Batch Processing</h2>
            <p className="text-gray-600 mb-4">
              Process up to 3 unvalidated articles from the database
            </p>
            <button
              onClick={testBatchProcessing}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Trigger Batch Processing'}
            </button>
          </div>

          {/* Test Validation API */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Test Validation API</h2>
            <p className="text-gray-600 mb-4">
              Test the AI validation with sample Japanese content
            </p>
            <button
              onClick={testValidationAPI}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Validating...' : 'Test Validation API'}
            </button>
          </div>

          {/* Test Cover Generation */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Test Cover Generation</h2>
            <p className="text-gray-600 mb-4">
              Test cover image generation with Unsplash/DALL-E
            </p>
            <button
              onClick={testCoverGeneration}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Generating...' : 'Test Cover Generation'}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <p className="font-bold">Error:</p>
              <p>{error}</p>
            </div>
          )}

          {/* Result Display */}
          {result && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Result:</h2>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
              
              {/* Display image if it's a cover generation result */}
              {result.imageUrl && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Generated Image:</h3>
                  <img 
                    src={result.imageUrl} 
                    alt="Generated cover" 
                    className="w-full max-w-2xl rounded-lg shadow-md"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">How to Use:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>To test a specific article, go to the News page and copy an article ID from the URL</li>
            <li>Paste the ID in the "Test Single Article" section and click Process</li>
            <li>To test batch processing, click "Trigger Batch Processing" to process unvalidated articles</li>
            <li>Use "Test Validation API" to test with sample content</li>
            <li>Use "Test Cover Generation" to test image generation</li>
          </ol>
          
          <h3 className="text-lg font-semibold mt-4 mb-3">What This Tests:</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>AI quality scoring (0-100)</li>
            <li>JLPT level detection</li>
            <li>Content structure analysis</li>
            <li>Auto-enhancement for low quality articles</li>
            <li>Cover image generation with Unsplash/DALL-E</li>
          </ul>
        </div>
      </div>
    </div>
  );
}