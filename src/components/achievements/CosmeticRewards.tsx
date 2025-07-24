'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AchievementManager } from '@/lib/achievements/manager';

interface CosmeticItem {
  id: string;
  name: string;
  type: 'avatar_frame' | 'background' | 'theme';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  preview: string; // URL or CSS class
  description: string;
  isOwned: boolean;
  isEquipped: boolean;
}

interface CosmeticRewardsProps {
  className?: string;
}

export function CosmeticRewards({ className = '' }: CosmeticRewardsProps) {
  const [cosmetics, setCosmetics] = useState<CosmeticItem[]>([]);
  const [selectedType, setSelectedType] = useState<'all' | 'avatar_frame' | 'background' | 'theme'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCosmetics();
  }, []);

  const loadCosmetics = async () => {
    try {
      setIsLoading(true);
      const ownedCosmetics = await AchievementManager.getCosmeticRewards();
      
      // Mock cosmetic items (in a real app, this would come from a database)
      const allCosmetics: CosmeticItem[] = [
        // Avatar Frames
        {
          id: 'golden_streak_frame',
          name: 'Golden Streak Frame',
          type: 'avatar_frame',
          rarity: 'epic',
          preview: '/cosmetics/frames/golden-streak.png',
          description: 'A golden frame for streak masters',
          isOwned: ownedCosmetics.includes('golden_streak_frame'),
          isEquipped: false
        },
        {
          id: 'scholar_badge',
          name: 'Scholar Badge',
          type: 'avatar_frame',
          rarity: 'epic',
          preview: '/cosmetics/frames/scholar-badge.png',
          description: 'Badge of scholarly achievement',
          isOwned: ownedCosmetics.includes('scholar_badge'),
          isEquipped: false
        },
        {
          id: 'immortal_aura',
          name: 'Immortal Aura',
          type: 'avatar_frame',
          rarity: 'legendary',
          preview: '/cosmetics/frames/immortal-aura.png',
          description: 'Legendary aura for immortal learners',
          isOwned: ownedCosmetics.includes('immortal_aura'),
          isEquipped: false
        },
        {
          id: 'sage_aura',
          name: 'Sage Aura',
          type: 'avatar_frame',
          rarity: 'legendary',
          preview: '/cosmetics/frames/sage-aura.png',
          description: 'Mystical aura of the word sage',
          isOwned: ownedCosmetics.includes('sage_aura'),
          isEquipped: false
        },
        {
          id: 'speed_trail',
          name: 'Speed Trail',
          type: 'avatar_frame',
          rarity: 'epic',
          preview: '/cosmetics/frames/speed-trail.png',
          description: 'Lightning trail for speed demons',
          isOwned: ownedCosmetics.includes('speed_trail'),
          isEquipped: false
        },

        // Backgrounds
        {
          id: 'cherry_blossom_bg',
          name: 'Cherry Blossom',
          type: 'background',
          rarity: 'rare',
          preview: '/cosmetics/backgrounds/cherry-blossom.jpg',
          description: 'Beautiful cherry blossom background',
          isOwned: ownedCosmetics.includes('cherry_blossom_bg'),
          isEquipped: false
        },
        {
          id: 'mountain_sunset_bg',
          name: 'Mountain Sunset',
          type: 'background',
          rarity: 'epic',
          preview: '/cosmetics/backgrounds/mountain-sunset.jpg',
          description: 'Serene mountain sunset scene',
          isOwned: ownedCosmetics.includes('mountain_sunset_bg'),
          isEquipped: false
        },

        // Themes
        {
          id: 'golden_theme',
          name: 'Golden Theme',
          type: 'theme',
          rarity: 'legendary',
          preview: '#fbbf24',
          description: 'Luxurious golden color scheme',
          isOwned: ownedCosmetics.includes('golden_theme'),
          isEquipped: false
        },
        {
          id: 'sakura_theme',
          name: 'Sakura Theme',
          type: 'theme',
          rarity: 'epic',
          preview: '#f472b6',
          description: 'Soft pink sakura-inspired theme',
          isOwned: ownedCosmetics.includes('sakura_theme'),
          isEquipped: false
        }
      ];

      // Load equipped items from localStorage
      const equippedFrame = localStorage.getItem('equipped_avatar_frame');
      const equippedBackground = localStorage.getItem('equipped_background');
      const equippedTheme = localStorage.getItem('equipped_theme');

      allCosmetics.forEach(item => {
        if (item.type === 'avatar_frame' && item.id === equippedFrame) {
          item.isEquipped = true;
        } else if (item.type === 'background' && item.id === equippedBackground) {
          item.isEquipped = true;
        } else if (item.type === 'theme' && item.id === equippedTheme) {
          item.isEquipped = true;
        }
      });

      setCosmetics(allCosmetics);
    } catch (error) {
      console.error('Error loading cosmetics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const equipCosmetic = (cosmetic: CosmeticItem) => {
    if (!cosmetic.isOwned) return;

    // Unequip all items of the same type
    const updatedCosmetics = cosmetics.map(item => ({
      ...item,
      isEquipped: item.type === cosmetic.type ? item.id === cosmetic.id : item.isEquipped
    }));

    setCosmetics(updatedCosmetics);

    // Save to localStorage
    if (cosmetic.isEquipped) {
      // Unequip
      localStorage.removeItem(`equipped_${cosmetic.type}`);
    } else {
      // Equip
      localStorage.setItem(`equipped_${cosmetic.type}`, cosmetic.id);
    }

    // Dispatch event for other components to react
    window.dispatchEvent(new CustomEvent('cosmeticEquipped', {
      detail: { type: cosmetic.type, id: cosmetic.isEquipped ? null : cosmetic.id }
    }));
  };

  const getRarityStyles = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return { border: 'border-gray-300', bg: 'bg-gray-50', text: 'text-gray-800', glow: '' };
      case 'rare':
        return { border: 'border-blue-300', bg: 'bg-blue-50', text: 'text-blue-800', glow: 'shadow-blue-200' };
      case 'epic':
        return { border: 'border-purple-300', bg: 'bg-purple-50', text: 'text-purple-800', glow: 'shadow-purple-200' };
      case 'legendary':
        return { border: 'border-yellow-300', bg: 'bg-yellow-50', text: 'text-yellow-800', glow: 'shadow-yellow-200' };
      default:
        return { border: 'border-gray-300', bg: 'bg-gray-50', text: 'text-gray-800', glow: '' };
    }
  };

  const filteredCosmetics = selectedType === 'all' 
    ? cosmetics 
    : cosmetics.filter(c => c.type === selectedType);

  const typeLabels = {
    all: 'All Items',
    avatar_frame: 'Avatar Frames',
    background: 'Backgrounds',
    theme: 'Themes'
  };

  const typeIcons = {
    all: '🎨',
    avatar_frame: '🖼️',
    background: '🌄',
    theme: '🎭'
  };

  if (isLoading) {
    return (
      <div className={`${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-card rounded-lg p-4 border">
                <div className="w-full h-32 bg-muted rounded mb-3"></div>
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-3 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">Cosmetic Rewards</h2>
        <p className="text-muted-foreground">
          Customize your profile with rewards earned from achievements
        </p>
      </div>

      {/* Type Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(typeLabels) as Array<keyof typeof typeLabels>).map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedType === type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <span className="mr-1">{typeIcons[type]}</span>
              {typeLabels[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Cosmetics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredCosmetics.map((cosmetic, index) => {
          const rarityStyles = getRarityStyles(cosmetic.rarity);
          
          return (
            <motion.div
              key={cosmetic.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                bg-card rounded-lg border p-4 transition-all cursor-pointer
                ${cosmetic.isOwned 
                  ? `${rarityStyles.border} hover:${rarityStyles.glow}` 
                  : 'border-muted opacity-50'
                }
                ${cosmetic.isEquipped ? 'ring-2 ring-primary' : ''}
              `}
              onClick={() => equipCosmetic(cosmetic)}
            >
              {/* Preview */}
              <div className="relative mb-3">
                <div className="w-full h-32 rounded bg-muted flex items-center justify-center overflow-hidden">
                  {cosmetic.type === 'theme' ? (
                    <div 
                      className="w-full h-full rounded"
                      style={{ backgroundColor: cosmetic.preview }}
                    />
                  ) : (
                    <div className="text-4xl">
                      {cosmetic.type === 'avatar_frame' ? '🖼️' : '🌄'}
                    </div>
                  )}
                </div>

                {/* Equipped Badge */}
                {cosmetic.isEquipped && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}

                {/* Lock Overlay */}
                {!cosmetic.isOwned && (
                  <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="text-center">
                <h3 className="font-semibold text-foreground mb-1 text-sm">
                  {cosmetic.name}
                </h3>
                <p className="text-xs text-muted-foreground mb-2">
                  {cosmetic.description}
                </p>

                {/* Rarity Badge */}
                <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${rarityStyles.bg} ${rarityStyles.text}`}>
                  {cosmetic.rarity}
                </div>

                {/* Action Button */}
                <div className="mt-2">
                  {!cosmetic.isOwned ? (
                    <span className="text-xs text-muted-foreground">
                      Unlock via achievements
                    </span>
                  ) : cosmetic.isEquipped ? (
                    <button className="text-xs text-primary font-medium">
                      Equipped ✓
                    </button>
                  ) : (
                    <button className="text-xs text-primary hover:text-primary/80 font-medium">
                      Equip
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredCosmetics.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎨</div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            No cosmetics in this category
          </h3>
          <p className="text-muted-foreground">
            Complete achievements to unlock cosmetic rewards!
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-foreground">
              {cosmetics.filter(c => c.isOwned).length}
            </div>
            <div className="text-sm text-muted-foreground">Owned</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">
              {cosmetics.filter(c => c.isEquipped).length}
            </div>
            <div className="text-sm text-muted-foreground">Equipped</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">
              {cosmetics.filter(c => c.rarity === 'legendary' && c.isOwned).length}
            </div>
            <div className="text-sm text-muted-foreground">Legendary</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">
              {Math.round((cosmetics.filter(c => c.isOwned).length / cosmetics.length) * 100)}%
            </div>
            <div className="text-sm text-muted-foreground">Collection</div>
          </div>
        </div>
      </div>
    </div>
  );
}