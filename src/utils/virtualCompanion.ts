export interface CompanionCharacter {
  path: string;
  name: string;
  category: string;
}

export interface CompanionHistory {
  recentCharacters: string[];
  lastShownDate?: string;
}

// Available character icons - simplified subset
export const ALL_CHARACTERS: CompanionCharacter[] = [
  // Wild Animals
  { path: '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/001-raccoon.svg', name: 'Raccoon', category: 'wild-animals' },
  { path: '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/005-fox.svg', name: 'Fox', category: 'wild-animals' },
  { path: '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/008-koala.svg', name: 'Koala', category: 'wild-animals' },
  { path: '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/009-panda-bear.svg', name: 'Panda', category: 'wild-animals' },
  { path: '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/012-sloth.svg', name: 'Sloth', category: 'wild-animals' },
  { path: '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/015-monkey.svg', name: 'Monkey', category: 'wild-animals' },
  { path: '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/019-lion.svg', name: 'Lion', category: 'wild-animals' },
  { path: '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/020-elephant.svg', name: 'Elephant', category: 'wild-animals' },
  
  // Farm Animals
  { path: '/flat-icons/4193242-animals/svg/004-sheep.svg', name: 'Sheep', category: 'animals' },
  { path: '/flat-icons/4193242-animals/svg/010-rabbit.svg', name: 'Rabbit', category: 'animals' },
  { path: '/flat-icons/4193242-animals/svg/015-alpaca.svg', name: 'Alpaca', category: 'animals' },
  { path: '/flat-icons/4193242-animals/svg/026-squirrel.svg', name: 'Squirrel', category: 'animals' },
];

// Encouraging quotes
export const ENCOURAGING_QUOTES = [
  "Every kanji you learn is a step closer to understanding Japan! 🇯🇵",
  "Don't worry about making mistakes - they're how we learn!",
  "You're building bridges between cultures with every word you master! 🌉",
  "Japanese may seem difficult, but you're more capable than you think! 💪",
  "Each conjugation you master makes you more fluent! Keep going! ✨",
  "Your dedication to learning Japanese is truly inspiring! 🌟",
  "Progress, not perfection! You're doing amazing! 🚀",
  "Small steps every day lead to big achievements! 👣",
  "Believe in yourself - you've got this! 💫",
  "Every expert was once a beginner. Keep learning! 🌱",
];

export function getRandomCharacter(history?: CompanionHistory): CompanionCharacter {
  const recentPaths = history?.recentCharacters || [];
  
  // Filter out recently shown characters
  const availableCharacters = ALL_CHARACTERS.filter(
    char => !recentPaths.includes(char.path)
  );
  
  // If all characters have been shown recently, reset
  const charactersToChooseFrom = availableCharacters.length > 0 
    ? availableCharacters 
    : ALL_CHARACTERS;
  
  const randomIndex = Math.floor(Math.random() * charactersToChooseFrom.length);
  return charactersToChooseFrom[randomIndex];
}

export function getRandomQuote(): string {
  const randomIndex = Math.floor(Math.random() * ENCOURAGING_QUOTES.length);
  return ENCOURAGING_QUOTES[randomIndex];
}

export function updateCompanionHistory(
  history: CompanionHistory,
  newCharacterPath: string
): CompanionHistory {
  const recentCharacters = [
    newCharacterPath,
    ...history.recentCharacters.filter(path => path !== newCharacterPath)
  ].slice(0, 5); // Keep only last 5 characters
  
  return {
    recentCharacters,
    lastShownDate: new Date().toISOString()
  };
}