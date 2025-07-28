'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import { MobileAwareContainer } from '@/components/layout/MobileAwareContainer';
import { motion } from 'framer-motion';
import { useStrings } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { Article } from '@/types/article';
import { articleService } from '@/services/articleService';

export default function NewsClient() {
  const router = useRouter();
  const strings = useStrings();
  const { user } = useAuth();
  const { checkAndTrack } = useAccess();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  useEffect(() => {
    loadArticles();
  }, [selectedCategory, selectedDifficulty]);

  const loadArticles = async () => {
    try {
      setLoading(true);
      const loadedArticles = await articleService.getArticles({
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        difficulty: selectedDifficulty === 'all' ? undefined : selectedDifficulty
      });
      setArticles(loadedArticles);
    } catch (error) {
      console.error('Failed to load articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReadArticle = async (article: Article) => {
    // Check access
    const result = await checkAndTrack('news_reading');
    if (!result.hasAccess) {
      alert(strings.news?.upgradePrompt || 'Please upgrade to read more articles');
      return;
    }

    router.push(`/news/${article.id}`);
  };

  const categories = ['all', 'technology', 'culture', 'business', 'entertainment', 'sports'];
  const difficulties = ['all', 'beginner', 'intermediate', 'advanced'];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'advanced':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
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
        <div className="mb-6 space-y-4">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {strings.news?.category || "Category"}
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg transition-colors capitalize ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {strings.news?.[category] || category}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {strings.news?.difficulty || "Difficulty"}
            </label>
            <div className="flex flex-wrap gap-2">
              {difficulties.map(difficulty => (
                <button
                  key={difficulty}
                  onClick={() => setSelectedDifficulty(difficulty)}
                  className={`px-4 py-2 rounded-lg transition-colors capitalize ${
                    selectedDifficulty === difficulty
                      ? 'bg-purple-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {strings.news?.[difficulty] || difficulty}
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
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex-1">
                    {article.title}
                  </h3>
                  <span className={`ml-2 text-xs px-2 py-1 rounded-full ${getDifficultyColor(article.difficulty)}`}>
                    {article.difficulty}
                  </span>
                </div>
                
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                  {article.summary}
                </p>
                
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="capitalize">{article.category}</span>
                  <span>•</span>
                  <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{article.readingTime} {strings.news?.minRead || "min read"}</span>
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
    </div>
  );
}