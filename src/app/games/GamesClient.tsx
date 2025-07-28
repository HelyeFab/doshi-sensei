'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import { MobileAwareContainer } from '@/components/layout/MobileAwareContainer';
import { useStrings } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface Game {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  color: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: 'kanji' | 'vocabulary' | 'reading' | 'writing';
}

const games: Game[] = [
  {
    id: 'kanji-simon',
    title: 'Kanji Simon',
    description: 'Test your memory with kanji in this Simon Says style game',
    icon: '🧠',
    href: '/games/kanji-simon',
    color: 'bg-purple-500',
    difficulty: 'intermediate',
    category: 'kanji'
  },
  {
    id: 'reading-routes',
    title: 'Reading Routes',
    description: 'Navigate through Japanese text to reach your destination',
    icon: '🗺️',
    href: '/games/reading-routes',
    color: 'bg-blue-500',
    difficulty: 'advanced',
    category: 'reading'
  },
  {
    id: 'stroke-order-practice',
    title: 'Stroke Order Practice',
    description: 'Master the correct stroke order for writing kanji',
    icon: '✍️',
    href: '/games/stroke-order-practice',
    color: 'bg-green-500',
    difficulty: 'beginner',
    category: 'writing'
  }
];

export default function GamesClient() {
  const router = useRouter();
  const strings = useStrings();
  const [selectedCategory, setSelectedCategory] = useState<'all' | Game['category']>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | Game['difficulty']>('all');

  const filteredGames = games.filter(game => {
    const categoryMatch = selectedCategory === 'all' || game.category === selectedCategory;
    const difficultyMatch = selectedDifficulty === 'all' || game.difficulty === selectedDifficulty;
    return categoryMatch && difficultyMatch;
  });

  const categories: Game['category'][] = ['kanji', 'vocabulary', 'reading', 'writing'];
  const difficulties: Game['difficulty'][] = ['beginner', 'intermediate', 'advanced'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SmartPageHeader
        title={strings.games?.title || "Japanese Learning Games"}
        icon="puzzle"
        description={strings.games?.description || "Fun and interactive games to practice Japanese"}
      />

      <MobileAwareContainer className="pb-20">
        {/* Filters */}
        <div className="mb-6 space-y-4">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {strings.games?.category || "Category"}
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {strings.games?.allCategories || "All Categories"}
              </button>
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
                  {strings.games?.[category] || category}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {strings.games?.difficulty || "Difficulty"}
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedDifficulty('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedDifficulty === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {strings.games?.allDifficulties || "All Difficulties"}
              </button>
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
                  {strings.games?.[difficulty] || difficulty}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Games Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredGames.map((game, index) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Link href={game.href}>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-lg transition-all cursor-pointer overflow-hidden group">
                  <div className={`h-32 ${game.color} flex items-center justify-center text-6xl group-hover:scale-110 transition-transform`}>
                    {game.icon}
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {game.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                      {game.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        game.difficulty === 'beginner' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                        game.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                        'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {strings.games?.[game.difficulty] || game.difficulty}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {strings.games?.[game.category] || game.category}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {filteredGames.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 dark:text-gray-400">
              {strings.games?.noGamesFound || "No games found matching your filters"}
            </p>
          </div>
        )}

        {/* Coming Soon Section */}
        <div className="mt-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            {strings.games?.comingSoon || "More Games Coming Soon!"}
          </h3>
          <p className="text-blue-700 dark:text-blue-300 text-sm">
            {strings.games?.comingSoonDescription || "We're working on more exciting games to help you practice Japanese in fun ways. Stay tuned!"}
          </p>
        </div>
      </MobileAwareContainer>
    </div>
  );
}