// Types for Sentence Scramble Game

import { Sentence, StudyList } from '@/types';

export interface WordBlock {
  id: string;
  text: string;
  originalIndex: number;
  currentIndex: number;
  isCorrectPosition: boolean;
  color: string; // pastel color for 3D effect
  isDistractor?: boolean; // Mark if this is a distractor
  distractorImage?: string; // Image path for distractors
}

export interface ScrambledSentence {
  id: string;
  originalSentence: Sentence;
  wordBlocks: WordBlock[];
  userOrder: WordBlock[];
  attempts: number;
  isCompleted: boolean;
  isCorrect: boolean;
}

export interface GameState {
  phase: 'list-selection' | 'instructions' | 'sentence-flash' | 'countdown' | 'scramble' | 'game-over';
  selectedLists: StudyList[];
  sentences: Sentence[];
  currentSentenceIndex: number;
  currentSentence: ScrambledSentence | null;
  totalScore: number;
  totalAttempts: number;
  gameStartTime: number;
  timeRemaining: number; // for 20-second timer
  showDistractors: boolean;
}

export interface GameStats {
  totalSentences: number;
  completedSentences: number;
  totalAttempts: number;
  accuracy: number;
  averageTime: number;
}

// Pastel colors for 3D word blocks
export const WORD_BLOCK_COLORS = [
  '#FFB3BA', // Light Pink
  '#FFDFBA', // Light Peach
  '#FFFFBA', // Light Yellow
  '#BAFFBA', // Light Green
  '#BAE1FF', // Light Blue
  '#E6BAFF', // Light Purple
  '#FFBAE6', // Light Magenta
  '#FFE4BA', // Light Orange
  '#D4BAFF', // Light Lavender
  '#BAFFDF', // Light Mint
  '#FFC9BA', // Light Coral
  '#E1BAFF', // Light Violet
];

// Game constants
export const GAME_CONSTANTS = {
  MAX_SELECTED_LISTS: 5,
  MAX_ATTEMPTS_PER_SENTENCE: 5,
  SENTENCE_FLASH_DURATION: 20000, // 20 seconds
  COUNTDOWN_DURATION: 3, // 3-2-1
  SCRAMBLE_TIME_LIMIT: 20000, // 20 seconds
  MIN_SENTENCES_PER_GAME: 5,
  MAX_SENTENCES_PER_GAME: 10,
};

// Reuse distractor images from KanaDrop
export const DISTRACTOR_IMAGES = [
  // Pokemon-themed PNG files
  '/flat-icons/188915-pokemon-go/png/star.png',
  '/flat-icons/188915-pokemon-go/png/map.png',
  '/flat-icons/188915-pokemon-go/png/smartphone.png',
  '/flat-icons/188915-pokemon-go/png/pokedex.png',
  '/flat-icons/188915-pokemon-go/png/pokeball.png',
  
  // Farm Animals
  '/flat-icons/4193242-animals/svg/002-buffalo.svg',
  '/flat-icons/4193242-animals/svg/003-flamingo.svg',
  '/flat-icons/4193242-animals/svg/004-sheep.svg',
  '/flat-icons/4193242-animals/svg/005-horse.svg',
  '/flat-icons/4193242-animals/svg/006-cow.svg',
  '/flat-icons/4193242-animals/svg/007-pig.svg',
  '/flat-icons/4193242-animals/svg/008-hedgehog.svg',
  '/flat-icons/4193242-animals/svg/010-rabbit.svg',
  '/flat-icons/4193242-animals/svg/015-alpaca.svg',
  '/flat-icons/4193242-animals/svg/019-llama.svg',
  '/flat-icons/4193242-animals/svg/020-goat.svg',
  '/flat-icons/4193242-animals/svg/026-squirrel.svg',
  
  // Wild Animals
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/001-raccoon.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/002-zebra.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/003-bear.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/004-cheetah.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/005-fox.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/006-leopard.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/007-giraffe.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/008-koala.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/009-panda bear.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/010-tiger.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/012-sloth.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/013-hippopotamus.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/014-rhinoceros.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/015-monkey.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/016-deer.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/019-lion.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/020-elephant.svg',
  
  // Emotions
  '/flat-icons/17517790-summer-watermelon/svg/001-happy.svg',
  '/flat-icons/17517790-summer-watermelon/svg/002-love.svg',
  '/flat-icons/17517790-summer-watermelon/svg/011-laugh emoji.svg',
  '/flat-icons/17517790-summer-watermelon/svg/013-wow.svg',
  '/flat-icons/17517790-summer-watermelon/svg/014-angel.svg',
  '/flat-icons/17517790-summer-watermelon/svg/018-valentin day.svg',
  '/flat-icons/17517790-summer-watermelon/svg/020-ok.svg',
  
  // Numbers
  '/flat-icons/4019664-alphabet-and-numbers/svg/035-1.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/036-2.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/037-3.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/038-4.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/039-5.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/040-6.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/041-7.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/042-8.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/043-9.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/044-0.svg',
];