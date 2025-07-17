'use client';

import React, { useState, useEffect } from 'react';
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

interface NodePosition {
  x: number; // 0-100 percentage
  y: number; // absolute pixels
}

interface AdjustableSnakePathProps {
  nodes: PathNode[];
  onNodeClick?: (node: PathNode) => void;
  nodeSpacing?: number;
}

export function AdjustableSnakePath({ 
  nodes, 
  onNodeClick,
  nodeSpacing = 120
}: AdjustableSnakePathProps) {
  // Initialize positions with a default snake pattern
  const [nodePositions, setNodePositions] = useState<NodePosition[]>(() => {
    return nodes.map((_, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      const isEvenRow = row % 2 === 0;
      
      // Default snake pattern
      let x: number;
      if (isEvenRow) {
        x = 20 + (col * 30); // 20%, 50%, 80%
      } else {
        x = 20 + ((2 - col) * 30); // 80%, 50%, 20%
      }
      
      return {
        x,
        y: index * nodeSpacing + 50
      };
    });
  });

  // Update a node's position
  const updateNodePosition = (index: number, x: number) => {
    setNodePositions(prev => {
      const newPositions = [...prev];
      newPositions[index] = { ...newPositions[index], x };
      return newPositions;
    });
  };

  // Export positions to console for production use
  const exportPositions = () => {
    console.log('// Production positions:');
    console.log('const PRODUCTION_POSITIONS = [');
    nodePositions.forEach((pos, i) => {
      console.log(`  { x: ${pos.x.toFixed(1)}, y: ${pos.y} }, // ${nodes[i]?.title || `Node ${i}`}`);
    });
    console.log('];');
  };

  const totalHeight = nodes.length * nodeSpacing + 200;

  return (
    <div className="relative w-full">
      {/* Export Button */}
      <div className="mb-4 p-4 bg-card border border-border rounded-lg">
        <h3 className="text-sm font-semibold mb-2">Developer Tools</h3>
        <button
          onClick={exportPositions}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-sm"
        >
          Export Positions to Console
        </button>
        <p className="text-xs text-muted-foreground mt-2">
          Adjust sliders to create the perfect curve, then export for production
        </p>
      </div>

      {/* Node Container */}
      <div 
        className="relative w-full bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 rounded-2xl overflow-hidden"
        style={{ height: totalHeight }}
      >
        {/* Grid lines for reference */}
        <div className="absolute inset-0 pointer-events-none">
          {[20, 50, 80].map(x => (
            <div
              key={x}
              className="absolute top-0 bottom-0 w-px bg-border/30"
              style={{ left: `${x}%` }}
            />
          ))}
        </div>

        {/* Nodes with sliders */}
        {nodes.map((node, index) => {
          const position = nodePositions[index];
          if (!position) return null;

          return (
            <div key={node.id}>
              {/* Node */}
              <motion.div
                className="absolute"
                style={{
                  left: `${position.x}%`,
                  top: position.y,
                  transform: 'translateX(-50%)'
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ 
                  delay: index * 0.05,
                  type: "spring",
                  stiffness: 260,
                  damping: 20
                }}
              >
                <AdjustableNode 
                  node={node} 
                  index={index}
                  onClick={() => onNodeClick?.(node)} 
                />
              </motion.div>

              {/* Position Slider */}
              <div 
                className="absolute w-full px-8"
                style={{ top: position.y + 80 }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-8">
                    {position.x.toFixed(0)}%
                  </span>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={position.x}
                    onChange={(e) => updateNodePosition(index, Number(e.target.value))}
                    className="flex-1 h-2 bg-border rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${(position.x - 10) / 80 * 100}%, var(--border) ${(position.x - 10) / 80 * 100}%, var(--border) 100%)`
                    }}
                  />
                  <span className="text-xs text-muted-foreground ml-1">
                    {node.title}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Preview line (optional) */}
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 0 }}
        >
          <path
            d={nodePositions.map((pos, i) => 
              `${i === 0 ? 'M' : 'L'} ${pos.x}% ${pos.y}`
            ).join(' ')}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2"
            strokeDasharray="5 5"
            opacity="0.3"
          />
        </svg>
      </div>

      {/* Position Data Display */}
      <div className="mt-4 p-4 bg-muted/50 rounded-lg">
        <h4 className="text-sm font-semibold mb-2">Current Positions:</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs font-mono">
          {nodePositions.map((pos, i) => (
            <div key={i} className="text-muted-foreground">
              {nodes[i]?.title}: {pos.x.toFixed(0)}%
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface AdjustableNodeProps {
  node: PathNode;
  index: number;
  onClick: () => void;
}

function AdjustableNode({ node, index, onClick }: AdjustableNodeProps) {
  const isLocked = node.type === 'locked';
  const isCheckpoint = node.type === 'checkpoint';
  const isCurrent = node.current;
  
  const nodeSize = isCheckpoint ? 'w-20 h-20' : 'w-16 h-16';
  
  return (
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
      
      {/* Node number for reference */}
      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground">
        #{index + 1}
      </div>
    </button>
  );
}