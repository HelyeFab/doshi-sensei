'use client';

import { motion } from 'framer-motion';
import { Tile as TileType, GAME_CONFIG } from './types';

interface TileProps {
  tile: TileType;
  onClick: (tileId: string) => void;
  disabled: boolean;
}

export default function Tile({ tile, onClick, disabled }: TileProps) {
  const handleClick = () => {
    if (!disabled && !tile.isFlipped && !tile.isMatched) {
      onClick(tile.id);
    }
  };

  return (
    <motion.div
      className="relative aspect-square cursor-pointer min-h-[100px] md:min-h-[120px] lg:min-h-[140px]"
      whileHover={!disabled && !tile.isFlipped && !tile.isMatched ? { scale: 1.05 } : {}}
      whileTap={!disabled && !tile.isFlipped && !tile.isMatched ? { scale: 0.95 } : {}}
      style={{ position: 'relative', zIndex: tile.isMatched ? 10 : 1 }}
    >
      <div
        className="relative w-full h-full preserve-3d"
        style={{
          transformStyle: 'preserve-3d',
          transition: `transform ${GAME_CONFIG.FLIP_DURATION}ms`,
          transform: tile.isFlipped || tile.isMatched ? 'rotateY(180deg)' : 'rotateY(0deg)',
          zIndex: 1
        }}
        onClick={handleClick}
      >
        {/* Back of tile */}
        <motion.div
          className="absolute inset-0 backface-hidden rounded-lg border-2 border-border bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center p-4 hover:border-primary/50 transition-colors"
          style={{ backfaceVisibility: 'hidden' }}
          animate={tile.isMatched ? {
            opacity: 0,
            scale: 0.8
          } : {}}
          transition={{ 
            opacity: { delay: 0.5, duration: 0.3 },
            scale: { delay: 0.5, duration: 0.3 }
          }}
        >
          <img
            src={tile.backIcon}
            alt="Tile back"
            className="w-16 h-16 md:w-20 md:h-20 object-contain opacity-80"
          />
        </motion.div>

        {/* Front of tile */}
        <motion.div
          className={`absolute inset-0 backface-hidden rounded-lg border-2 flex items-center justify-center p-6 ${
            tile.isMatched
              ? 'bg-green-500/20 border-green-500 text-green-700 dark:text-green-300'
              : 'bg-card border-primary text-foreground'
          }`}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
          animate={tile.isMatched ? {
            opacity: 0,
            scale: 0.8
          } : {}}
          transition={{ 
            opacity: { delay: 0.5, duration: 0.3 },
            scale: { delay: 0.5, duration: 0.3 }
          }}
        >
          <div className="text-center">
            {/* Check if this is a meaning tile (English text) */}
            {tile.id.includes('meaning-') && tile.id.endsWith('-2') ? (
              <div className="text-lg md:text-xl lg:text-2xl font-bold px-2 break-words">{tile.displayText}</div>
            ) : (
              <div className="text-2xl md:text-3xl lg:text-4xl font-bold">{tile.displayText}</div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Match animation overlay - Explosion effect */}
      {tile.isMatched && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 100 }}>
          {/* Explosion particles */}
          <motion.div
            initial={{ scale: 0.8, opacity: 1 }}
            animate={{ 
              scale: [0.8, 1.5, 2.5],
              opacity: [1, 0.8, 0]
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <div 
              className="absolute inset-0 rounded-full blur-lg"
              style={{
                background: 'radial-gradient(circle, #FDE047 0%, #FB923C 40%, #EF4444 80%)',
                boxShadow: '0 0 40px #FB923C'
              }}
            />
          </motion.div>
          
          {/* Particle bursts */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute top-1/2 left-1/2 w-3 h-3 bg-yellow-400 rounded-full pointer-events-none z-50 shadow-lg"
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{
                x: Math.cos(i * Math.PI / 4) * 80,
                y: Math.sin(i * Math.PI / 4) * 80,
                opacity: 0,
                scale: [1, 1.5, 0]
              }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            />
          ))}
          
          {/* Central flash */}
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ 
              scale: [0, 1.2, 0.8],
              opacity: [1, 1, 0]
            }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
          >
            <div className="text-5xl md:text-6xl">💥</div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}