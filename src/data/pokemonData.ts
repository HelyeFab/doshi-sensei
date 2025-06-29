// Pokémon data with rarity classifications
export interface Pokemon {
  id: number;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare';
}

// Legendary and Mythical Pokémon IDs
const LEGENDARY_POKEMON = new Set([
  144, 145, 146, // Articuno, Zapdos, Moltres
  150, // Mewtwo
  243, 244, 245, // Raikou, Entei, Suicune
  249, 250, // Lugia, Ho-Oh
  377, 378, 379, // Regirock, Regice, Registeel
  380, 381, // Latias, Latios
  382, 383, 384, // Kyogre, Groudon, Rayquaza
  480, 481, 482, // Uxie, Mesprit, Azelf
  483, 484, 487, // Dialga, Palkia, Giratina
  638, 639, 640, // Cobalion, Terrakion, Virizion
  641, 642, 643, 644, 645, 646, // Tornadus, Thundurus, Reshiram, Zekrom, Landorus, Kyurem
  716, 717, 718, // Xerneas, Yveltal, Zygarde
  785, 786, 787, 788, // Tapu Koko, Tapu Lele, Tapu Bulu, Tapu Fini
  791, 792, // Solgaleo, Lunala
  800, // Necrozma
  888, 889, 890, // Zacian, Zamazenta, Eternatus
  894, 895, 896, 897, 898, // Regieleki, Regidrago, Glastrier, Spectrier, Calyrex
  905, // Enamorus
]);

const MYTHICAL_POKEMON = new Set([
  151, // Mew
  251, // Celebi
  385, 386, // Jirachi, Deoxys
  489, 490, // Phione, Manaphy
  491, 492, 493, // Darkrai, Shaymin, Arceus
  494, // Victini
  647, 648, 649, // Keldeo, Meloetta, Genesect
  719, 720, 721, // Diancie, Hoopa, Volcanion
  801, 802, // Magearna, Marshadow
  807, 808, 809, // Zeraora, Meltan, Melmetal
  893, // Zarude
]);

// Starter Pokémon and their evolutions (uncommon)
const STARTER_POKEMON = new Set([
  1, 2, 3, 4, 5, 6, 7, 8, 9, // Gen 1
  152, 153, 154, 155, 156, 157, 158, 159, 160, // Gen 2
  252, 253, 254, 255, 256, 257, 258, 259, 260, // Gen 3
  387, 388, 389, 390, 391, 392, 393, 394, 395, // Gen 4
  495, 496, 497, 498, 499, 500, 501, 502, 503, // Gen 5
  650, 651, 652, 653, 654, 655, 656, 657, 658, // Gen 6
  722, 723, 724, 725, 726, 727, 728, 729, 730, // Gen 7
  810, 811, 812, 813, 814, 815, 816, 817, 818, // Gen 8
  906, 907, 908, 909, 910, 911, 912, 913, 914, // Gen 9
]);

// Pseudo-legendary Pokémon (uncommon)
const PSEUDO_LEGENDARY = new Set([
  147, 148, 149, // Dratini line
  246, 247, 248, // Larvitar line
  371, 372, 373, // Bagon line
  374, 375, 376, // Beldum line
  443, 444, 445, // Gible line
  633, 634, 635, // Deino line
  704, 705, 706, // Goomy line
  782, 783, 784, // Jangmo-o line
  885, 886, 887, // Dreepy line
]);

// Function to determine Pokémon rarity
export function getPokemonRarity(id: number): 'common' | 'uncommon' | 'rare' {
  if (LEGENDARY_POKEMON.has(id) || MYTHICAL_POKEMON.has(id)) {
    return 'rare';
  }
  if (STARTER_POKEMON.has(id) || PSEUDO_LEGENDARY.has(id)) {
    return 'uncommon';
  }
  return 'common';
}

// Function to select a random Pokémon based on rarity distribution
export function getRandomPokemon(): number {
  const rand = Math.random();
  let targetRarity: 'common' | 'uncommon' | 'rare';
  
  // 60% common, 30% uncommon, 10% rare
  if (rand < 0.6) {
    targetRarity = 'common';
  } else if (rand < 0.9) {
    targetRarity = 'uncommon';
  } else {
    targetRarity = 'rare';
  }
  
  // Get all Pokémon IDs of the target rarity
  const candidates: number[] = [];
  for (let id = 1; id <= 1025; id++) {
    if (getPokemonRarity(id) === targetRarity) {
      candidates.push(id);
    }
  }
  
  // Return a random Pokémon from the candidates
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// Get Pokémon sprite URL
export function getPokemonSpriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

// Get Pokémon silhouette (we'll use CSS filters for this)
export function getPokemonSilhouetteStyle(): React.CSSProperties {
  return {
    filter: 'brightness(0) saturate(100%)',
    opacity: 0.8
  };
}