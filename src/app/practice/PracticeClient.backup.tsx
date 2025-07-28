'use client';

import { useRouter } from 'next/navigation';
import { SmartNavigationLink } from '@/components/navigation/SmartNavigationLink';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import { MobileAwareContainer } from '@/components/layout/MobileAwareContainer';
import { useStrings } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';

interface PracticeOption {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  color: string;
  level: 'beginner' | 'intermediate' | 'advanced';
}

const practiceOptions: PracticeOption[] = [
  {
    id: 'hiragana',
    title: 'Hiragana',
    description: 'Practice basic hiragana characters',
    href: '/practice/hiragana',
    icon: 'あ',
    color: 'bg-pink-500',
    level: 'beginner'
  },
  {
    id: 'katakana',
    title: 'Katakana',
    description: 'Practice basic katakana characters',
    href: '/practice/katakana',
    icon: 'ア',
    color: 'bg-purple-500',
    level: 'beginner'
  },
  {
    id: 'kana',
    title: 'All Kana',
    description: 'Practice both hiragana and katakana',
    href: '/practice/kana',
    icon: 'かな',
    color: 'bg-indigo-500',
    level: 'beginner'
  },
  {
    id: 'conjugation',
    title: 'Verb Conjugation',
    description: 'Master Japanese verb forms',
    href: '/practice/conjugation',
    icon: '動',
    color: 'bg-blue-500',
    level: 'intermediate'
  },
  {
    id: 'drill-conjugation',
    title: 'Conjugation Drills',
    description: 'Intensive conjugation practice',
    href: '/drill/conjugation',
    icon: '練',
    color: 'bg-green-500',
    level: 'intermediate'
  },
  {
    id: 'flashcards',
    title: 'Flashcards',
    description: 'Review vocabulary with spaced repetition',
    href: '/drill/flashcards',
    icon: '札',
    color: 'bg-yellow-500',
    level: 'beginner'
  }
];

export default function PracticeClient() {
  const router = useRouter();
  const strings = useStrings();

  const beginnerOptions = practiceOptions.filter(opt => opt.level === 'beginner');
  const intermediateOptions = practiceOptions.filter(opt => opt.level === 'intermediate');
  const advancedOptions = practiceOptions.filter(opt => opt.level === 'advanced');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SmartPageHeader
        title={strings.practice?.title || "Practice"}
        icon="edit"
        description={strings.practice?.description || "Choose your practice mode"}
      />

      <MobileAwareContainer className="pb-20">
        {/* Beginner Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {strings.practice?.beginnerSection || "Beginner"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {beginnerOptions.map((option, index) => (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <SmartNavigationLink href={option.href}>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-lg transition-all cursor-pointer overflow-hidden group">
                    <div className={`h-24 ${option.color} flex items-center justify-center text-white text-4xl font-bold group-hover:scale-110 transition-transform`}>
                      {option.icon}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {strings.practice?.[option.id]?.title || option.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {strings.practice?.[option.id]?.description || option.description}
                      </p>
                    </div>
                  </div>
                </SmartNavigationLink>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Intermediate Section */}
        {intermediateOptions.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {strings.practice?.intermediateSection || "Intermediate"}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {intermediateOptions.map((option, index) => (
                <motion.div
                  key={option.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: (beginnerOptions.length + index) * 0.05 }}
                >
                  <SmartNavigationLink href={option.href}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-lg transition-all cursor-pointer overflow-hidden group">
                      <div className={`h-24 ${option.color} flex items-center justify-center text-white text-4xl font-bold group-hover:scale-110 transition-transform`}>
                        {option.icon}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {strings.practice?.[option.id]?.title || option.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {strings.practice?.[option.id]?.description || option.description}
                        </p>
                      </div>
                    </div>
                  </SmartNavigationLink>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Advanced Section */}
        {advancedOptions.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {strings.practice?.advancedSection || "Advanced"}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {advancedOptions.map((option, index) => (
                <motion.div
                  key={option.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: (beginnerOptions.length + intermediateOptions.length + index) * 0.05 }}
                >
                  <SmartNavigationLink href={option.href}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-lg transition-all cursor-pointer overflow-hidden group">
                      <div className={`h-24 ${option.color} flex items-center justify-center text-white text-4xl font-bold group-hover:scale-110 transition-transform`}>
                        {option.icon}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {strings.practice?.[option.id]?.title || option.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {strings.practice?.[option.id]?.description || option.description}
                        </p>
                      </div>
                    </div>
                  </SmartNavigationLink>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Progress Overview */}
        <section className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            {strings.practice?.progressTitle || "Your Progress"}
          </h3>
          <p className="text-blue-700 dark:text-blue-300 text-sm">
            {strings.practice?.progressDescription || "Track your learning journey across all practice modes. Complete exercises to unlock achievements and level up!"}
          </p>
        </section>
      </MobileAwareContainer>
    </div>
  );
}