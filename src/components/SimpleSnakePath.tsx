'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface PathNode {
  id: string;
  type: 'lesson' | 'checkpoint' | 'locked';
  icon?: string;
  title: string;
  subtitle?: string;
  completed?: boolean;
  current?: boolean;
}

interface SimpleSnakePathProps {
  nodes: PathNode[];
  onNodeClick?: (node: PathNode) => void;
}

export function SimpleSnakePath({ nodes, onNodeClick }: SimpleSnakePathProps) {
  return (
    <div className="relative w-full px-8 py-12">
      {/* Path connector lines using CSS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {nodes.map((node, index) => {
          if (index === nodes.length - 1) return null;
          
          const row = Math.floor(index / 3);
          const col = index % 3;
          const isEvenRow = row % 2 === 0;
          
          // Determine line type based on position
          const isHorizontal = col < 2;
          const isVertical = col === 2;
          
          return (
            <div
              key={`line-${index}`}
              className={`
                absolute border-dashed
                ${node.completed ? 'border-green-400' : 'border-gray-300'}
                ${isHorizontal ? 'border-t-4' : ''}
                ${isVertical ? 'border-l-4 h-32' : ''}
              `}
              style={{
                top: `${row * 128 + 64}px`,
                left: isEvenRow 
                  ? (isHorizontal ? `${33.33 * col + 16.67}%` : '66.67%')
                  : (isHorizontal ? `${33.33 * (2 - col) + 16.67}%` : '33.33%'),
                width: isHorizontal ? '33.33%' : '4px',
                transform: isVertical ? 'translateY(50%)' : 'translateY(-50%)',
              }}
            />
          );
        })}
      </div>
      
      {/* Nodes Grid */}
      <div className="relative grid grid-cols-3 gap-y-32">
        {nodes.map((node, index) => {
          const row = Math.floor(index / 3);
          const col = index % 3;
          const isEvenRow = row % 2 === 0;
          
          // Calculate position for snake pattern
          const position = isEvenRow ? col : 2 - col;
          
          return (
            <motion.div
              key={node.id}
              className={`
                flex justify-center
                ${position === 0 ? 'justify-start' : ''}
                ${position === 2 ? 'justify-end' : ''}
                ${position === 1 ? 'justify-center' : ''}
              `}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                delay: index * 0.1,
                type: "spring",
                stiffness: 260,
                damping: 20
              }}
              style={{ gridColumn: position + 1 }}
            >
              <SimpleNode 
                node={node} 
                index={index}
                onClick={() => onNodeClick?.(node)} 
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

interface SimpleNodeProps {
  node: PathNode;
  index: number;
  onClick: () => void;
}

function SimpleNode({ node, index, onClick }: SimpleNodeProps) {
  const isLocked = node.type === 'locked';
  const isCheckpoint = node.type === 'checkpoint';
  const isCurrent = node.current;
  
  const nodeSize = isCheckpoint ? 'w-20 h-20' : 'w-16 h-16';
  
  return (
    <div className="relative">
      <button
        onClick={onClick}
        disabled={isLocked}
        className={`
          relative ${nodeSize} rounded-full
          transition-all duration-300
          ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-110'}
          ${isCurrent ? 'animate-pulse' : ''}
        `}
      >
        {/* Node background */}
        <div
          className={`
            absolute inset-0 rounded-full shadow-lg
            ${isLocked ? 'bg-gray-300' : ''}
            ${isCheckpoint ? 'bg-gradient-to-br from-yellow-400 to-amber-500' : ''}
            ${!isLocked && !isCheckpoint && node.completed ? 'bg-gradient-to-br from-green-400 to-emerald-500' : ''}
            ${!isLocked && !isCheckpoint && !node.completed ? 'bg-gradient-to-br from-purple-400 to-violet-500' : ''}
          `}
        />
        
        {/* Current node indicator */}
        {isCurrent && (
          <div className="absolute -inset-2 rounded-full border-4 border-purple-500 animate-pulse" />
        )}
        
        {/* Progress ring for completed nodes */}
        {node.completed && !isCheckpoint && (
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="48%"
              fill="none"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="3"
            />
          </svg>
        )}
        
        {/* Node content */}
        <div className="relative flex items-center justify-center h-full">
          {isLocked ? (
            <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          ) : node.icon ? (
            <span className={`${isCheckpoint ? 'text-3xl' : 'text-2xl'}`}>{node.icon}</span>
          ) : (
            <span className="text-xl text-white font-bold">
              {node.completed ? '✓' : index + 1}
            </span>
          )}
        </div>
      </button>
      
      {/* Node label */}
      <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 text-center whitespace-nowrap">
        {node.title && (
          <div className="text-sm font-semibold text-foreground">
            {node.title}
          </div>
        )}
        {node.subtitle && (
          <div className="text-xs text-muted-foreground">
            {node.subtitle}
          </div>
        )}
      </div>
    </div>
  );
}