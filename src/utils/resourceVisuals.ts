/**
 * Visual styling utilities for resource cards
 */

// Beautiful pastel color combinations with custom dark text color
const RESOURCE_COLOR_THEMES = [
  {
    bg: 'bg-gradient-to-br from-pink-100 to-rose-200',
    border: 'border-pink-300',
    text: 'text-[#615970]',
    textShadow: '',
    accent: 'bg-pink-600',
    shadow: 'shadow-pink-300/40',
  },
  {
    bg: 'bg-gradient-to-br from-blue-100 to-sky-200',
    border: 'border-blue-300',
    text: 'text-[#615970]',
    textShadow: '',
    accent: 'bg-blue-600',
    shadow: 'shadow-blue-300/40',
  },
  {
    bg: 'bg-gradient-to-br from-green-100 to-emerald-200',
    border: 'border-green-300',
    text: 'text-[#615970]',
    textShadow: '',
    accent: 'bg-green-600',
    shadow: 'shadow-green-300/40',
  },
  {
    bg: 'bg-gradient-to-br from-purple-100 to-violet-200',
    border: 'border-purple-300',
    text: 'text-[#615970]',
    textShadow: '',
    accent: 'bg-purple-600',
    shadow: 'shadow-purple-300/40',
  },
  {
    bg: 'bg-gradient-to-br from-yellow-100 to-amber-200',
    border: 'border-yellow-300',
    text: 'text-[#615970]',
    textShadow: '',
    accent: 'bg-yellow-600',
    shadow: 'shadow-yellow-300/40',
  },
  {
    bg: 'bg-gradient-to-br from-indigo-100 to-blue-200',
    border: 'border-indigo-300',
    text: 'text-[#615970]',
    textShadow: '',
    accent: 'bg-indigo-600',
    shadow: 'shadow-indigo-300/40',
  },
  {
    bg: 'bg-gradient-to-br from-teal-100 to-cyan-200',
    border: 'border-teal-300',
    text: 'text-[#615970]',
    textShadow: '',
    accent: 'bg-teal-600',
    shadow: 'shadow-teal-300/40',
  },
  {
    bg: 'bg-gradient-to-br from-orange-100 to-red-200',
    border: 'border-orange-300',
    text: 'text-[#615970]',
    textShadow: '',
    accent: 'bg-orange-600',
    shadow: 'shadow-orange-300/40',
  },
  {
    bg: 'bg-gradient-to-br from-slate-100 to-gray-200',
    border: 'border-slate-300',
    text: 'text-[#615970]',
    textShadow: '',
    accent: 'bg-slate-600',
    shadow: 'shadow-slate-300/40',
  },
  {
    bg: 'bg-gradient-to-br from-rose-100 to-pink-200',
    border: 'border-rose-300',
    text: 'text-[#615970]',
    textShadow: '',
    accent: 'bg-rose-600',
    shadow: 'shadow-rose-300/40',
  },
];

// Dark mode variants (using same dark text color for consistency)
const RESOURCE_COLOR_THEMES_DARK = [
  {
    bg: 'dark:bg-gradient-to-br dark:from-pink-900/20 dark:to-rose-900/30',
    border: 'dark:border-pink-800/50',
    text: 'dark:text-[#615970]',
    accent: 'dark:bg-pink-600',
    shadow: 'dark:shadow-pink-900/20',
  },
  {
    bg: 'dark:bg-gradient-to-br dark:from-blue-900/20 dark:to-sky-900/30',
    border: 'dark:border-blue-800/50',
    text: 'dark:text-[#615970]',
    accent: 'dark:bg-blue-600',
    shadow: 'dark:shadow-blue-900/20',
  },
  {
    bg: 'dark:bg-gradient-to-br dark:from-green-900/20 dark:to-emerald-900/30',
    border: 'dark:border-green-800/50',
    text: 'dark:text-[#615970]',
    accent: 'dark:bg-green-600',
    shadow: 'dark:shadow-green-900/20',
  },
  {
    bg: 'dark:bg-gradient-to-br dark:from-purple-900/20 dark:to-violet-900/30',
    border: 'dark:border-purple-800/50',
    text: 'dark:text-[#615970]',
    accent: 'dark:bg-purple-600',
    shadow: 'dark:shadow-purple-900/20',
  },
  {
    bg: 'dark:bg-gradient-to-br dark:from-yellow-900/20 dark:to-amber-900/30',
    border: 'dark:border-yellow-800/50',
    text: 'dark:text-[#615970]',
    accent: 'dark:bg-yellow-600',
    shadow: 'dark:shadow-yellow-900/20',
  },
  {
    bg: 'dark:bg-gradient-to-br dark:from-indigo-900/20 dark:to-blue-900/30',
    border: 'dark:border-indigo-800/50',
    text: 'dark:text-[#615970]',
    accent: 'dark:bg-indigo-600',
    shadow: 'dark:shadow-indigo-900/20',
  },
  {
    bg: 'dark:bg-gradient-to-br dark:from-teal-900/20 dark:to-cyan-900/30',
    border: 'dark:border-teal-800/50',
    text: 'dark:text-[#615970]',
    accent: 'dark:bg-teal-600',
    shadow: 'dark:shadow-teal-900/20',
  },
  {
    bg: 'dark:bg-gradient-to-br dark:from-orange-900/20 dark:to-red-900/30',
    border: 'dark:border-orange-800/50',
    text: 'dark:text-[#615970]',
    accent: 'dark:bg-orange-600',
    shadow: 'dark:shadow-orange-900/20',
  },
  {
    bg: 'dark:bg-gradient-to-br dark:from-slate-900/40 dark:to-gray-900/50',
    border: 'dark:border-slate-700/50',
    text: 'dark:text-[#615970]',
    accent: 'dark:bg-slate-600',
    shadow: 'dark:shadow-slate-900/20',
  },
  {
    bg: 'dark:bg-gradient-to-br dark:from-rose-900/20 dark:to-pink-900/30',
    border: 'dark:border-rose-800/50',
    text: 'dark:text-[#615970]',
    accent: 'dark:bg-rose-600',
    shadow: 'dark:shadow-rose-900/20',
  },
];

/**
 * Generate consistent color theme based on resource ID
 */
export function getResourceColorTheme(resourceId: string) {
  // Create a simple hash from the resource ID for consistency
  let hash = 0;
  for (let i = 0; i < resourceId.length; i++) {
    const char = resourceId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  const index = Math.abs(hash) % RESOURCE_COLOR_THEMES.length;
  const lightTheme = RESOURCE_COLOR_THEMES[index];
  const darkTheme = RESOURCE_COLOR_THEMES_DARK[index];
  
  return {
    bg: `${lightTheme.bg} ${darkTheme.bg}`,
    border: `${lightTheme.border} ${darkTheme.border}`,
    text: `${lightTheme.text} ${darkTheme.text}`,
    textShadow: `${lightTheme.textShadow}`,
    accent: `${lightTheme.accent} ${darkTheme.accent}`,
    shadow: `${lightTheme.shadow} ${darkTheme.shadow}`,
  };
}

/**
 * Get random icon path for resources without images
 */
export function getResourceIcon(resourceId: string): string {
  const icons = [
    '17517790-summer-watermelon/svg/001-happy.svg',
    '17517790-summer-watermelon/svg/002-love.svg',
    '17517790-summer-watermelon/svg/013-wow.svg',
    '17517790-summer-watermelon/svg/020-ok.svg',
    '4193242-animals/svg/002-buffalo.svg',
    '4193242-animals/svg/003-flamingo.svg',
    '4193242-animals/svg/010-rabbit.svg',
    '4193242-animals/svg/019-llama.svg',
    '4193242-animals/svg/026-squirrel.svg',
  ];
  
  // Use the same hash logic for consistency
  let hash = 0;
  for (let i = 0; i < resourceId.length; i++) {
    const char = resourceId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const index = Math.abs(hash) % icons.length;
  return `/flat-icons/${icons[index]}`;
}

/**
 * Get emoji based on resource category or content
 */
export function getCategoryEmoji(category?: string, tags: string[] = []): string {
  const allText = [category || '', ...tags].join(' ').toLowerCase();
  
  if (allText.includes('video') || allText.includes('youtube')) return '🎥';
  if (allText.includes('grammar')) return '📝';
  if (allText.includes('vocabulary') || allText.includes('vocab')) return '📚';
  if (allText.includes('kanji')) return '🉐';
  if (allText.includes('culture')) return '🎌';
  if (allText.includes('study') || allText.includes('tips')) return '💡';
  if (allText.includes('news')) return '📰';
  if (allText.includes('technology') || allText.includes('tech')) return '💻';
  if (allText.includes('announcement')) return '📢';
  if (allText.includes('update')) return '🆕';
  if (allText.includes('social') || allText.includes('instagram') || allText.includes('twitter')) return '📱';
  if (allText.includes('external') || allText.includes('resource')) return '🔗';
  
  // Default emojis for different categories
  const defaultEmojis = ['📖', '✨', '🌟', '💎', '🎯', '🚀', '🌸', '🍃'];
  const index = Math.abs(allText.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % defaultEmojis.length;
  return defaultEmojis[index];
}