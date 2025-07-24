// Shared configuration for snake path nodes
// This file is used by both the practice page and admin dashboard

export interface PathNode {
  id: string;
  type: 'lesson' | 'checkpoint' | 'locked';
  icon?: string;
  title: string;
  subtitle?: string;
  completed?: boolean;
  current?: boolean;
  href?: string;
  pillPosition?: 'left' | 'right' | 'top';
}

export const SNAKE_PATH_NODES: PathNode[] = [
  {
    id: 'start',
    type: 'checkpoint',
    icon: '🌸',
    title: 'Welcome!',
    subtitle: 'Start here',
    completed: true,
    pillPosition: 'top'
  },
  {
    id: 'hiragana',
    type: 'lesson',
    icon: 'あ',
    title: 'Hiragana',
    subtitle: 'Basic syllabary',
    completed: true,
    href: '/practice/hiragana',
    pillPosition: 'left'
  },
  {
    id: 'katakana',
    type: 'lesson',
    icon: 'ア',
    title: 'Katakana',
    subtitle: 'Foreign words',
    completed: true,
    current: true,
    href: '/practice/katakana',
    pillPosition: 'right'
  },
  {
    id: 'checkpoint-1',
    type: 'checkpoint',
    icon: '🎮',
    title: 'Checkpoint 1',
    subtitle: 'Play games!',
    completed: true,
    href: '/games',
    pillPosition: 'left'
  },
  {
    id: 'conjugation',
    type: 'lesson',
    icon: '動',
    title: 'Conjugation',
    subtitle: 'Verb forms',
    href: '/practice/conjugation',
    pillPosition: 'right'
  },
  {
    id: 'conjugation-drill',
    type: 'lesson',
    icon: '⚡',
    title: 'Conjugation Drill',
    subtitle: 'Quick practice',
    href: '/drill/conjugation',
    pillPosition: 'left'
  },
  {
    id: 'flashcards',
    type: 'lesson',
    icon: '/flat-icons/ui/flash-card.svg',
    title: 'Flashcards',
    subtitle: 'Spaced repetition',
    href: '/drill/flashcards',
    pillPosition: 'left'
  },
  {
    id: 'checkpoint-2',
    type: 'checkpoint',
    icon: '🕹️',
    title: 'Checkpoint 2',
    subtitle: 'More games!',
    href: '/games',
    pillPosition: 'left'
  },
  {
    id: 'kanji-browser',
    type: 'lesson',
    icon: '漢',
    title: 'Kanji Browser',
    subtitle: 'Explore kanji',
    href: '/kanji-browser',
    pillPosition: 'right'
  },
  {
    id: 'vocabulary',
    type: 'lesson',
    icon: '📚',
    title: 'Vocabulary',
    subtitle: 'Browse words',
    href: '/vocabulary',
    pillPosition: 'left'
  },
  {
    id: 'mood-boards',
    type: 'lesson',
    icon: '🎭',
    title: 'Mood Boards',
    subtitle: 'Kanji by feeling',
    href: '/kanji-moods',
    pillPosition: 'right'
  },
  {
    id: 'checkpoint-3',
    type: 'checkpoint',
    icon: '🎯',
    title: 'Checkpoint 3',
    subtitle: 'Game time!',
    href: '/games',
    pillPosition: 'left'
  },
  {
    id: 'news',
    type: 'lesson',
    icon: '📰',
    title: 'News',
    subtitle: 'Latest updates',
    href: '/news',
    pillPosition: 'right'
  },
  {
    id: 'ai-stories',
    type: 'lesson',
    icon: '🤖',
    title: 'AI Stories',
    subtitle: 'Interactive tales',
    href: '/stories',
    pillPosition: 'left'
  },
  {
    id: 'resources',
    type: 'lesson',
    icon: '🎌',
    title: 'Resources',
    subtitle: 'Learning tools',
    href: '/resources',
    pillPosition: 'right'
  }
];