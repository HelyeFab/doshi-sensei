'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import { MobileAwareContainer } from '@/components/layout/MobileAwareContainer';
import { motion } from 'framer-motion';
import { useStrings } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { NewsArticle } from '@/types/news';
import { getWatanocArticles, triggerArticleScraping, getArticleStats } from '@/utils/watanocArticles';
import { LoginPromptModal } from '@/components/LoginPromptModal';
import { UpgradeSlideUpModal } from '@/components/UpgradeSlideUpModal';

export default function NewsClient() {
  const router = useRouter();
  const strings = useStrings();
  const { user } = useAuth();
  const { checkAndTrack } = useAccess();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    loadArticles();
  }, [selectedLevel]);

  const loadArticles = async () => {
    try {
      setLoading(true);
      const loadedArticles = await getWatanocArticles();
      
      // Filter by level if selected
      const filtered = selectedLevel === 'all' 
        ? loadedArticles 
        : loadedArticles.filter(article => article.level === selectedLevel);
      
      setArticles(filtered);
    } catch (error) {
      console.error('Failed to load articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReadArticle = async (article: NewsArticle) => {
    // Check access
    const result = await checkAndTrack('news_reading');
    if (!result.hasAccess) {
      if (!user) {
        setShowLoginPrompt(true);
      } else {
        setShowUpgradeModal(true);
      }
      return;
    }

    router.push(`/news/${article.id}`);
  };

  const levels = ['all', 'N5', 'N4', 'N3', 'N2', 'N1'];

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'N5':
      case 'N4':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'N3':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'N2':
      case 'N1':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SmartPageHeader
        title={strings.news?.title || "Japanese News"}
        icon="newspaper"
        description={strings.news?.description || "Read real Japanese news articles"}
      />

      <MobileAwareContainer className="pb-20">
        {/* Filters */}
        <div className="mb-6">
          {/* Level Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {strings.news?.level || "JLPT Level"}
            </label>
            <div className="flex flex-wrap gap-2">
              {levels.map(level => (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedLevel === level
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {level === 'all' ? strings.news?.allLevels || 'All Levels' : level}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Articles Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map((article, index) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => handleReadArticle(article)}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer p-6"
              >
                <div className="flex items-start gap-4">
                  {article.thumbnail && (
                    <img 
                      src={article.thumbnail} 
                      alt={article.title}
                      className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex-1">
                        <span dangerouslySetInnerHTML={{ __html: article.titleWithRuby || article.title }} />
                      </h3>
                      <span className={`ml-2 text-xs px-2 py-1 rounded-full ${getLevelColor(article.level)}`}>
                        {article.level}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                      <span dangerouslySetInnerHTML={{ __html: article.summaryWithRuby || article.summary }} />
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>{article.source}</span>
                      <span>•</span>
                      <span>{formatDate(article.publishedDate)}</span>
                      {article.readingTime && (
                        <>
                          <span>•</span>
                          <span>{article.readingTime} {strings.news?.minRead || "min read"}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {articles.length === 0 && !loading && (
          <div className="text-center py-20">
            <p className="text-gray-500 dark:text-gray-400">
              {strings.news?.noArticles || "No articles found for the selected filters"}
            </p>
          </div>
        )}
      </MobileAwareContainer>

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <LoginPromptModal onClose={() => setShowLoginPrompt(false)} />
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <UpgradeSlideUpModal onClose={() => setShowUpgradeModal(false)} />
      )}
    </div>
  );
}