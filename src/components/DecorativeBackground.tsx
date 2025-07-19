'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

interface DecorativeItem {
  id: string;
  src: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  animationDelay: number;
}

const decorativeAssets = [
  // Sakura petals
  '/flat-icons/sakura/petals.svg',
  '/flat-icons/sakura/sakura (1).svg',
  '/flat-icons/sakura/sakura (2).svg',
  '/flat-icons/sakura/sakura (5).svg',
  '/flat-icons/sakura/sakura (6).svg',
  
  // Wild animals (selecting a few cute ones)
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/008-koala.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/009-panda-bear.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/005-fox.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/012-sloth.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/016-deer.svg',
  
  // Summer watermelon emojis
  '/flat-icons/17517790-summer-watermelon/svg/001-happy.svg',
  '/flat-icons/17517790-summer-watermelon/svg/002-love.svg',
  '/flat-icons/17517790-summer-watermelon/svg/014-angel.svg',
];

export default function DecorativeBackground() {
  const [decorativeItems, setDecorativeItems] = useState<DecorativeItem[]>([]);

  useEffect(() => {
    // Generate random decorative items with better distribution
    const items: DecorativeItem[] = [];
    const numberOfItems = 12; // Reduced for less clutter
    
    // Create a grid-based distribution for better scattering
    const gridCells = 4; // 4x4 grid
    const usedCells = new Set<string>();

    for (let i = 0; i < numberOfItems; i++) {
      const randomAsset = decorativeAssets[Math.floor(Math.random() * decorativeAssets.length)];
      
      // Find an unused grid cell
      let gridX, gridY;
      let attempts = 0;
      do {
        gridX = Math.floor(Math.random() * gridCells);
        gridY = Math.floor(Math.random() * gridCells);
        attempts++;
      } while (usedCells.has(`${gridX},${gridY}`) && attempts < 20);
      
      usedCells.add(`${gridX},${gridY}`);
      
      // Position within the grid cell with some randomness
      const cellWidth = 100 / gridCells;
      const cellHeight = 100 / gridCells;
      const x = (gridX * cellWidth) + (Math.random() * cellWidth * 0.8) + (cellWidth * 0.1);
      const y = (gridY * cellHeight) + (Math.random() * cellHeight * 0.8) + (cellHeight * 0.1);
      
      items.push({
        id: `deco-${i}`,
        src: randomAsset,
        x: x,
        y: y,
        scale: 0.6 + Math.random() * 0.4, // Scale between 0.6 and 1.0
        rotation: 0, // No rotation to prevent skewing
        animationDelay: Math.random() * 5,
      });
    }
    
    setDecorativeItems(items);
  }, []);

  const getAnimationVariants = () => {
    return {
      opacity: [0.1, 0.8, 0.1],
      transition: {
        opacity: {
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }
    };
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {decorativeItems.map((item) => (
        <motion.div
          key={item.id}
          className="absolute"
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            transform: `scale(${item.scale})`,
          }}
          initial={{ opacity: 0 }}
          animate={getAnimationVariants()}
          transition={{
            opacity: { 
              duration: 3,
              delay: item.animationDelay,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }}
        >
          <div className="relative w-12 h-12 md:w-16 md:h-16">
            <Image
              src={item.src}
              alt="Decorative element"
              fill
              className="object-contain"
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}