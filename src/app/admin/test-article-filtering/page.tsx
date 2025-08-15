'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, limit, getDocs, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ArticleTest {
  id: string;
  title: string;
  contentPreview: string;
  isJapanese: boolean;
  japaneseRatio: number;
  source: string;
  qualityScore?: number;
  aiValidated?: boolean;
}

export default function TestArticleFiltering() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState<ArticleTest[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'english' | 'japanese'>('all');

  // Check if user is admin
  const isAdmin = user?.email === 'emmanuelfabiani23@gmail.com' || 
                  user?.email === 'admin@doshisensei.com';

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

  // Quick Japanese detection (client-side version)
  const isLikelyJapanese = (text: string): { isJapanese: boolean; ratio: number } => {
    if (!text || text.length < 50) {
      return { isJapanese: false, ratio: 0 };
    }

    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF。、！？「」『』（）]/g;
    const japaneseChars = (text.match(japaneseRegex) || []).length;
    const totalChars = text.replace(/\s/g, '').length;
    const ratio = totalChars > 0 ? japaneseChars / totalChars : 0;

    return {
      isJapanese: ratio > 0.3,
      ratio: ratio
    };
  };

  const analyzeArticles = async () => {
    setLoading(true);
    try {
      // Query recent articles
      const articlesRef = collection(db, 'articles');
      const q = query(
        articlesRef,
        orderBy('publishDate', 'desc'),
        limit(100)
      );
      
      const snapshot = await getDocs(q);
      const analyzedArticles: ArticleTest[] = [];
      
      let totalCount = 0;
      let japaneseCount = 0;
      let englishCount = 0;
      let validatedCount = 0;
      let needsValidationCount = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const content = data.content || data.body || '';
        const { isJapanese, ratio } = isLikelyJapanese(content);
        
        analyzedArticles.push({
          id: doc.id,
          title: data.title || 'No title',
          contentPreview: content.substring(0, 200) + '...',
          isJapanese,
          japaneseRatio: ratio,
          source: data.source || 'unknown',
          qualityScore: data.qualityScore,
          aiValidated: data.aiValidated
        });

        totalCount++;
        if (isJapanese) {
          japaneseCount++;
        } else {
          englishCount++;
        }
        if (data.aiValidated) {
          validatedCount++;
        } else {
          needsValidationCount++;
        }
      });

      setArticles(analyzedArticles);
      setStats({
        total: totalCount,
        japanese: japaneseCount,
        english: englishCount,
        japanesePercent: ((japaneseCount / totalCount) * 100).toFixed(1),
        englishPercent: ((englishCount / totalCount) * 100).toFixed(1),
        validated: validatedCount,
        needsValidation: needsValidationCount
      });

    } catch (error) {
      console.error('Error analyzing articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const testValidationAPI = async (articleId: string) => {
    try {
      const response = await fetch('/api/test-article-validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, forceReprocess: true })
      });
      
      const result = await response.json();
      alert(`Validation result: ${result.success ? 'Success' : 'Failed'}`);
      
      // Refresh the list
      await analyzeArticles();
    } catch (error) {
      console.error('Validation error:', error);
      alert('Validation failed');
    }
  };

  const triggerBatchValidation = async () => {
    try {
      const response = await fetch('/.netlify/functions/validate-articles-scheduled', {
        method: 'POST'
      });
      
      const result = await response.json();
      alert(`Batch validation: Processed ${result.summary?.processed || 0} articles`);
      
      // Refresh the list
      await analyzeArticles();
    } catch (error) {
      console.error('Batch validation error:', error);
      alert('Batch validation failed');
    }
  };

  useEffect(() => {
    if (isAdmin) {
      analyzeArticles();
    }
  }, [isAdmin]);

  const filteredArticles = articles.filter(article => {
    if (filter === 'english') return !article.isJapanese;
    if (filter === 'japanese') return article.isJapanese;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Article Filtering Test</h1>

        {/* Stats */}
        {stats && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Analysis Results</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Articles</div>
              </div>
              <div className="bg-green-50 p-4 rounded">
                <div className="text-2xl font-bold text-green-600">
                  {stats.japanese} ({stats.japanesePercent}%)
                </div>
                <div className="text-sm text-gray-600">Japanese</div>
              </div>
              <div className="bg-red-50 p-4 rounded">
                <div className="text-2xl font-bold text-red-600">
                  {stats.english} ({stats.englishPercent}%)
                </div>
                <div className="text-sm text-gray-600">English/Invalid</div>
              </div>
              <div className="bg-purple-50 p-4 rounded">
                <div className="text-2xl font-bold text-purple-600">
                  {stats.validated}/{stats.total}
                </div>
                <div className="text-sm text-gray-600">AI Validated</div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="flex gap-4">
            <button
              onClick={analyzeArticles}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Re-analyze Articles'}
            </button>
            <button
              onClick={triggerBatchValidation}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Run Batch Validation
            </button>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex gap-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              All ({articles.length})
            </button>
            <button
              onClick={() => setFilter('japanese')}
              className={`px-4 py-2 rounded ${filter === 'japanese' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
            >
              Japanese ({articles.filter(a => a.isJapanese).length})
            </button>
            <button
              onClick={() => setFilter('english')}
              className={`px-4 py-2 rounded ${filter === 'english' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}
            >
              English/Invalid ({articles.filter(a => !a.isJapanese).length})
            </button>
          </div>
        </div>

        {/* Articles List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">JP Ratio</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quality</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredArticles.map((article) => (
                <tr key={article.id} className={article.isJapanese ? '' : 'bg-red-50'}>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">
                      {article.title.substring(0, 50)}...
                    </div>
                    <div className="text-xs text-gray-500">
                      {article.contentPreview.substring(0, 100)}...
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{article.source}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      article.japaneseRatio > 0.3 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {(article.japaneseRatio * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {article.isJapanese ? (
                      <span className="text-green-600">✓ Japanese</span>
                    ) : (
                      <span className="text-red-600">✗ English</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {article.aiValidated ? (
                      <span className="text-blue-600">
                        Score: {article.qualityScore || 'N/A'}
                      </span>
                    ) : (
                      <span className="text-gray-400">Not validated</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => testValidationAPI(article.id)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Validate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}