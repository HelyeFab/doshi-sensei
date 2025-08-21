import { AppSettings } from '@/types';

// Available icon categories and their paths
export const ICON_CATEGORIES = {
  'wild-animals': 'flat-icons/8376275-wild-animals-flat-1-of-1/svg',
  'animals': 'flat-icons/4193242-animals/svg',
  'emotions': 'flat-icons/17517790-summer-watermelon/svg',
  'pets': 'flat-icons/4213615-pets/svg',
  'creativity': 'flat-icons/4228672-creativity/svg',
  'love': 'flat-icons/4288979-love/svg',
  'education': 'flat-icons/4341021-education/svg',
  'nature': 'flat-icons/4359705-nature/svg',
  'spring': 'flat-icons/4516570-spring/svg'
} as const;

// All available character icons
export const ALL_CHARACTERS = [
  // Wild Animals
  { path: '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/001-raccoon.svg', name: 'Raccoon', category: 'wild-animals' },
  { path: '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/002-zebra.svg', name: 'Zebra', category: 'wild-animals' },
  { path: '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/003-bear.svg', name: 'Bear', category: 'wild-animals' },
  { path: '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/004-cheetah.svg', name: 'Cheetah', category: 'wild-animals' },
  { path: '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/005-fox.svg', name: 'Fox', category: 'wild-animals' },
  { path: '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/006-leopard.svg', name: 'Leopard', category: 'wild-animals' },
  { path: '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/007-giraffe.svg', name: 'Giraffe', category: 'wild-animals' },
  { path: '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/008-koala.svg', name: 'Koala', category: 'wild-animals' },
  { path: '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/009-panda-bear.svg', name: 'Panda', category: 'wild-animals' },
  { path: '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/010-tiger.svg', name: 'Tiger', category: 'wild-animals' },
  { path: '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/012-sloth.svg', name: 'Sloth', category: 'wild-animals' },
  { path: '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/013-hippopotamus.svg', name: 'Hippo', category: 'wild-animals' },
  { path: '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/014-rhinoceros.svg', name: 'Rhino', category: 'wild-animals' },
  { path: '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/015-monkey.svg', name: 'Monkey', category: 'wild-animals' },
  { path: '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/016-deer.svg', name: 'Deer', category: 'wild-animals' },
  { path: '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/019-lion.svg', name: 'Lion', category: 'wild-animals' },
  { path: '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/020-elephant.svg', name: 'Elephant', category: 'wild-animals' },

  // Farm Animals
  { path: '/flat-icons/4193242-animals/svg/002-buffalo.svg', name: 'Buffalo', category: 'animals' },
  { path: '/flat-icons/4193242-animals/svg/003-flamingo.svg', name: 'Flamingo', category: 'animals' },
  { path: '/flat-icons/4193242-animals/svg/004-sheep.svg', name: 'Sheep', category: 'animals' },
  { path: '/flat-icons/4193242-animals/svg/005-horse.svg', name: 'Horse', category: 'animals' },
  { path: '/flat-icons/4193242-animals/svg/006-cow.svg', name: 'Cow', category: 'animals' },
  { path: '/flat-icons/4193242-animals/svg/007-pig.svg', name: 'Pig', category: 'animals' },
  { path: '/flat-icons/4193242-animals/svg/008-hedgehog.svg', name: 'Hedgehog', category: 'animals' },
  { path: '/flat-icons/4193242-animals/svg/010-rabbit.svg', name: 'Rabbit', category: 'animals' },
  { path: '/flat-icons/4193242-animals/svg/015-alpaca.svg', name: 'Alpaca', category: 'animals' },
  { path: '/flat-icons/4193242-animals/svg/019-llama.svg', name: 'Llama', category: 'animals' },
  { path: '/flat-icons/4193242-animals/svg/020-goat.svg', name: 'Goat', category: 'animals' },
  { path: '/flat-icons/4193242-animals/svg/026-squirrel.svg', name: 'Squirrel', category: 'animals' },

  // Emotion Characters (Watermelons)
  { path: '/flat-icons/17517790-summer-watermelon/svg/001-happy.svg', name: 'Happy Melon', category: 'emotions' },
  { path: '/flat-icons/17517790-summer-watermelon/svg/002-love.svg', name: 'Love Melon', category: 'emotions' },
  { path: '/flat-icons/17517790-summer-watermelon/svg/011-laugh-emoji.svg', name: 'Laughing Melon', category: 'emotions' },
  { path: '/flat-icons/17517790-summer-watermelon/svg/013-wow.svg', name: 'Amazed Melon', category: 'emotions' },
  { path: '/flat-icons/17517790-summer-watermelon/svg/014-angel.svg', name: 'Angel Melon', category: 'emotions' },
  { path: '/flat-icons/17517790-summer-watermelon/svg/018-valentin-day.svg', name: 'Valentine Melon', category: 'emotions' },
  { path: '/flat-icons/17517790-summer-watermelon/svg/020-ok.svg', name: 'OK Melon', category: 'emotions' },

  // Educational Characters
  { path: '/flat-icons/4341021-education/svg/011-book.svg', name: 'Wise Book', category: 'education' },
  { path: '/flat-icons/4341021-education/svg/012-laptop.svg', name: 'Study Laptop', category: 'education' },
  { path: '/flat-icons/4341021-education/svg/017-dictionary.svg', name: 'Smart Dictionary', category: 'education' },
  { path: '/flat-icons/4341021-education/svg/025-medal.svg', name: 'Achievement Medal', category: 'education' },
  { path: '/flat-icons/4341021-education/svg/037-trophy.svg', name: 'Victory Trophy', category: 'education' },
  { path: '/flat-icons/4341021-education/svg/049-mortarboard.svg', name: 'Graduate Cap', category: 'education' },
  { path: '/flat-icons/4341021-education/svg/029-telescope.svg', name: 'Explorer Telescope', category: 'education' },
  { path: '/flat-icons/4341021-education/svg/048-microscope.svg', name: 'Curious Microscope', category: 'education' },
  { path: '/flat-icons/4341021-education/svg/044-color-palette.svg', name: 'Creative Palette', category: 'education' },
  { path: '/flat-icons/4341021-education/svg/018-paper-plane.svg', name: 'Dream Plane', category: 'education' }
];

// Encouraging quotes (mix of Japanese learning and general motivation)
export const ENCOURAGING_QUOTES = [
  // Japanese Learning Specific
  "Every kanji you learn is a step closer to understanding Japan! 🇯🇵",
  "Don't worry about making mistakes - they're how we learn! 間違いは成長の一部です。",
  "You're building bridges between cultures with every word you master! 🌉",
  "Japanese may seem difficult, but you're more capable than you think! 💪",
  "Each conjugation you master makes you more fluent! Keep going! ✨",
  "Learning Japanese is like unlocking a secret code - you're doing great! 🔓",
  "Your dedication to learning Japanese is truly inspiring! 🌟",
  "Remember: even native speakers had to learn these rules once! 👶",
  "Every sentence you understand is a victory worth celebrating! 🎉",
  "Japanese grammar is like a puzzle - you're putting the pieces together perfectly! 🧩",

  // General Motivation
  "Progress, not perfection! You're doing amazing! 🚀",
  "Small steps every day lead to big achievements! 👣",
  "Believe in yourself - you've got this! 💫",
  "Every expert was once a beginner. Keep learning! 🌱",
  "Your hard work today builds tomorrow's success! 🏗️",
  "Challenges make you stronger - embrace them! 💪",
  "You're braver than you believe and stronger than you seem! 🦁",
  "Success is the sum of small efforts repeated day after day! ⭐",
  "Learning never exhausts the mind - keep growing! 🧠",
  "You're not just learning a language, you're expanding your world! 🌍",

  // Encouraging & Fun
  "You're like a language ninja - stealthy and skillful! 🥷",
  "High five for choosing to learn something amazing! 🙌",
  "You're collecting knowledge like treasures! 💎",
  "Learning is your superpower - use it wisely! 🦸‍♀️",
  "You're writing your own success story, one lesson at a time! 📖",
  "Curiosity brought you here, determination will take you far! 🧭",
  "You're proof that dreams with deadlines become goals! 🎯",
  "Every day you study, you're investing in yourself! 💰",
  "You turn obstacles into opportunities! That's amazing! 🔄",
  "Learning is a journey, not a destination - enjoy the ride! 🚗"
];

export interface CompanionCharacter {
  path: string;
  name: string;
  category: string;
}

/**
 * Get a random character that hasn't been shown recently
 */
export function getRandomCharacter(companionHistory: AppSettings['companionHistory']): CompanionCharacter {
  // Provide default values if companionHistory is undefined
  const recentCharacters = companionHistory?.recentCharacters || [];

  // Filter out recently shown characters
  const availableCharacters = ALL_CHARACTERS.filter(
    character => !recentCharacters.includes(character.path)
  );

  // If all characters have been shown recently, use all characters
  const charactersToChooseFrom = availableCharacters.length > 0 ? availableCharacters : ALL_CHARACTERS;

  // Get random character
  const randomIndex = Math.floor(Math.random() * charactersToChooseFrom.length);
  return charactersToChooseFrom[randomIndex];
}

/**
 * Get a random encouraging quote
 */
export function getRandomQuote(): string {
  const randomIndex = Math.floor(Math.random() * ENCOURAGING_QUOTES.length);
  return ENCOURAGING_QUOTES[randomIndex];
}

/**
 * Update companion history with a new character
 */
export function updateCompanionHistory(
  currentHistory: AppSettings['companionHistory'],
  newCharacterPath: string
): AppSettings['companionHistory'] {
  // Provide default values if currentHistory is undefined
  const recentCharacters = currentHistory?.recentCharacters || [];
  const updatedRecentCharacters = [newCharacterPath, ...recentCharacters];

  // Keep only the last 10 characters to avoid repetition but not exhaust all options too quickly
  const trimmedRecentCharacters = updatedRecentCharacters.slice(0, 10);

  return {
    recentCharacters: trimmedRecentCharacters,
    lastShownDate: new Date().toISOString()
  };
}

/**
 * Check if enough time has passed to show a different character
 */
export function shouldShowNewCharacter(companionHistory: AppSettings['companionHistory']): boolean {
  if (!companionHistory?.lastShownDate) return true;

  const lastShown = new Date(companionHistory.lastShownDate);
  const now = new Date();
  const timeDifference = now.getTime() - lastShown.getTime();

  // Show new character if it's been more than 1 hour (3600000 ms)
  // Or if it's been more than 10 minutes and less than 3 recent characters
  const oneHour = 60 * 60 * 1000;
  const tenMinutes = 10 * 60 * 1000;
  const recentCharacters = companionHistory?.recentCharacters || [];

  return timeDifference > oneHour ||
         (timeDifference > tenMinutes && recentCharacters.length < 3);
}