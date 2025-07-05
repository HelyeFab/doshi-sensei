// Types for Kana Drop Game

export interface KanaChar {
  id: string;
  kana: string;
  romaji: string;
  type: 'hiragana' | 'katakana';
}

export interface FallingObject {
  id: string;
  type: 'kana' | 'distractor';
  content: string; // kana character or image path
  kanaData?: KanaChar; // only for kana type
  x: number; // horizontal position (0-100%)
  y: number; // vertical position (0-100%)
  speed: number; // falling speed multiplier
}

export interface GameState {
  score: number;
  selectedKana: KanaChar[];
  activeRomaji: string | null;
  fallingObjects: FallingObject[];
  gameSpeed: number;
  isPlaying: boolean;
  isPaused: boolean;
  startTime: number;
  clicks: {
    correct: number;
    wrong: number;
    distractor: number;
  };
}

export interface GameStats {
  finalScore: number;
  timeTaken: number; // in seconds
  accuracy: number; // percentage
  totalClicks: number;
  correctClicks: number;
}

// Distractor images list (only from specified directories)
export const DISTRACTOR_IMAGES = [
  // 188915-pokemon-go/png
  '/flat-icons/188915-pokemon-go/png/star.png',
  '/flat-icons/188915-pokemon-go/png/map.png',
  '/flat-icons/188915-pokemon-go/png/smartphone.png',
  '/flat-icons/188915-pokemon-go/png/pokedex.png',
  '/flat-icons/188915-pokemon-go/png/pokeball.png',
  // 4019664-alphabet-and-numbers/svg
  '/flat-icons/4019664-alphabet-and-numbers/svg/001-A.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/002-b.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/003-c.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/004-c.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/005-d.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/006-e.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/007-f.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/008-g.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/009-h.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/010-I.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/011-j.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/012-k.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/013-l.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/014-m.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/015-n.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/016-n.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/017-o.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/018-p.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/019-q.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/020-r.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/021-s.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/022-t.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/023-u.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/024-v.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/025-w.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/026-x.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/027-y.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/028-z.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/029-ch.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/030-A.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/031-e.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/032-I.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/033-o.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/034-u.svg',
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
  '/flat-icons/4019664-alphabet-and-numbers/svg/045-10.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/046-infinity.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/047-hashtag.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/048-asterisk.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/049-exclamation mark.svg',
  '/flat-icons/4019664-alphabet-and-numbers/svg/050-alphabet.svg',
  // 4193242-animals/svg
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
  // 17517790-summer-watermelon/svg
  '/flat-icons/17517790-summer-watermelon/svg/001-happy.svg',
  '/flat-icons/17517790-summer-watermelon/svg/002-love.svg',
  '/flat-icons/17517790-summer-watermelon/svg/011-laugh emoji.svg',
  '/flat-icons/17517790-summer-watermelon/svg/013-wow.svg',
  '/flat-icons/17517790-summer-watermelon/svg/014-angel.svg',
  '/flat-icons/17517790-summer-watermelon/svg/018-valentin day.svg',
  '/flat-icons/17517790-summer-watermelon/svg/020-ok.svg',
];
// TODO: Investigate why 'wrong kana' objects are not spawning in the game.

// Game constants
export const GAME_CONSTANTS = {
  INITIAL_FALL_DURATION: 4000, // 4 seconds - slower for better gameplay
  MIN_FALL_DURATION: 1000, // 1 second minimum (4x speed)
  SPEED_INCREMENT_INTERVAL: 20, // Increase speed every 20 points as per design
  SPEED_INCREMENT_RATE: 0.1, // 10% faster each time as per design
  SPAWN_RATE_MIN: 500, // minimum time between spawns (0.5 seconds) as per design
  SPAWN_RATE_MAX: 1000, // maximum time between spawns (1 second) as per design
  KANA_SPAWN_CHANCE: 0.3, // 30% chance to spawn kana as per design (30% target, 70% distractors)
  WINNING_SCORE: 100,
  POINTS_CORRECT: 5,
  POINTS_MISSED: -10,
  POINTS_DISTRACTOR: -5,
  POINTS_WRONG_KANA: -10,
  GAME_WIDTH: 100, // percentage based positioning
  GAME_HEIGHT: 100,
  OBJECT_SIZE: 48, // pixels
  COUNTDOWN_DURATION: 3, // seconds
  FALL_SPEED: 0.5 // pixels per frame for falling objects
};
