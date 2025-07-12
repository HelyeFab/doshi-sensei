// Icon utilities for Matching Game

// Available icon collections with their paths - includes both SVG and PNG
const ICON_COLLECTIONS = [
  {
    path: '/flat-icons/17517790-summer-watermelon/svg/',
    icons: ['001-happy.svg', '002-love.svg', '011-laugh-emoji.svg', '013-wow.svg', '014-angel.svg', '018-valentin-day.svg', '020-ok.svg']
  },
  {
    path: '/flat-icons/1752632-pokemon/png/',
    icons: ['017-gaming.png', '019-gaming.png', '025-gaming.png', '028-gaming.png', '030-gaming.png', '035-gaming.png', '040-gaming.png', '055-gaming.png']
  },
  {
    path: '/flat-icons/188915-pokemon-go/png/',
    icons: ['map.png', 'pokeball.png', 'pokedex.png', 'smartphone.png', 'star.png']
  },
  {
    path: '/flat-icons/4193242-animals/svg/',
    icons: ['002-buffalo.svg', '003-flamingo.svg', '004-sheep.svg', '005-horse.svg', '006-cow.svg', '007-pig.svg', '008-hedgehog.svg', '010-rabbit.svg', '015-alpaca.svg', '019-llama.svg', '020-goat.svg', '026-squirrel.svg']
  },
  {
    path: '/flat-icons/4341021-education/svg/',
    icons: ['011-book.svg', '012-laptop.svg', '017-dictionary.svg', '018-paper-plane.svg', '025-medal.svg', '029-telescope.svg', '037-trophy.svg', '044-color-palette.svg', '048-microscope.svg', '049-mortarboard.svg']
  },
  {
    path: '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/',
    icons: ['001-raccoon.svg', '002-zebra.svg', '003-bear.svg', '004-cheetah.svg', '005-fox.svg', '006-leopard.svg', '007-giraffe.svg', '008-koala.svg', '009-panda-bear.svg', '010-tiger.svg', '012-sloth.svg', '013-hippopotamus.svg', '014-rhinoceros.svg', '015-monkey.svg', '016-deer.svg', '019-lion.svg', '020-elephant.svg']
  },
  {
    path: '/flat-icons/8376275-wild-animals-flat-1-of-1/png/',
    icons: ['007-giraffe.png']
  },
  {
    path: '/flat-icons/',
    icons: ['construction.svg', 'kana-drop.svg', 'listening.svg', 'magnifying-glass.svg', 'matching.svg', 'story.svg', 'word.svg']
  }
];

// Flatten all icons into a single array
const ALL_ICONS = ICON_COLLECTIONS.flatMap(collection => 
  collection.icons.map(icon => collection.path + icon)
);

/**
 * Get random unique icons for the tiles
 * @param count Number of unique icons needed
 * @returns Array of icon paths
 */
export function getRandomIcons(count: number): string[] {
  // Shuffle the icons array
  const shuffled = [...ALL_ICONS].sort(() => Math.random() - 0.5);
  
  // Take the first 'count' icons
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Get a set of random icons for tile backs
 * Each tile gets a unique icon for variety
 * @param tileCount Number of tiles in the game
 * @returns Array of icon paths
 */
export function getIconsForPairs(tileCount: number): string[] {
  // Get more icons than needed to ensure variety
  const iconPool = [...ALL_ICONS];
  const result: string[] = [];
  
  // Fill the result array with random icons, repeating from pool if needed
  for (let i = 0; i < tileCount; i++) {
    const randomIndex = Math.floor(Math.random() * iconPool.length);
    result.push(iconPool[randomIndex]);
  }
  
  return result;
}