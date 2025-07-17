'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface PathNode {
  id: string;
  type: 'lesson' | 'checkpoint' | 'locked';
  icon?: string;
  title: string;
  subtitle?: string;
  completed?: boolean;
  current?: boolean;
  position?: { x: number; y: number };
}

interface SnakePathProps {
  nodes: PathNode[];
  onNodeClick?: (node: PathNode) => void;
  pathColor?: string;
  nodeSpacing?: number;
  curveIntensity?: number;
}

export function SnakePath({ 
  nodes, 
  onNodeClick,
  pathColor = '#E5E7EB',
  nodeSpacing = 120,
  curveIntensity = 150
}: SnakePathProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pathData, setPathData] = useState<string>('');
  const [nodePositions, setNodePositions] = useState<Array<{ x: number; y: number }>>([]);
  
  // Calculate the snake path
  useEffect(() => {
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    const padding = 60;
    const effectiveWidth = containerWidth - (padding * 2);
    
    // Generate positions for nodes in a snake pattern
    const positions: Array<{ x: number; y: number }> = [];
    let currentY = 50;
    let direction = 1; // 1 for right, -1 for left
    
    nodes.forEach((node, index) => {
      // Calculate X position - alternate between left, center, right
      const segment = index % 3;
      let x: number;
      
      if (direction === 1) {
        // Moving right
        x = padding + (effectiveWidth * segment / 2);
      } else {
        // Moving left
        x = padding + effectiveWidth - (effectiveWidth * segment / 2);
      }
      
      // Add some randomness for a more organic feel
      const randomOffset = (Math.random() - 0.5) * 20;
      x += randomOffset;
      
      positions.push({ x, y: currentY });
      
      // Move down for next node
      currentY += nodeSpacing;
      
      // Change direction at the end of each row (every 3 nodes)
      if (segment === 2) {
        direction *= -1;
      }
    });
    
    setNodePositions(positions);
    
    // Create SVG path
    if (positions.length > 1) {
      let path = `M ${positions[0].x} ${positions[0].y}`;
      
      for (let i = 1; i < positions.length; i++) {
        const prev = positions[i - 1];
        const curr = positions[i];
        
        // Calculate control points for bezier curve
        const cp1x = prev.x;
        const cp1y = prev.y + curveIntensity / 2;
        const cp2x = curr.x;
        const cp2y = curr.y - curveIntensity / 2;
        
        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
      }
      
      setPathData(path);
    }
  }, [nodes, nodeSpacing, curveIntensity]);
  
  const totalHeight = nodes.length * nodeSpacing + 100;
  
  return (
    <div 
      ref={containerRef}
      className="relative w-full overflow-hidden"
      style={{ height: totalHeight }}
    >
      {/* SVG Path */}
      <svg 
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 1 }}
      >
        {/* Path shadow */}
        <path
          d={pathData}
          fill="none"
          stroke="rgba(0,0,0,0.1)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray="20 10"
          className="opacity-30"
          style={{ transform: 'translate(2px, 2px)' }}
        />
        
        {/* Main path */}
        <motion.path
          d={pathData}
          fill="none"
          stroke={pathColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="20 10"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />
        
        {/* Progress path */}
        <motion.path
          d={pathData}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ 
            pathLength: nodes.findIndex(n => n.current) / (nodes.length - 1) || 0 
          }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        
        {/* Gradient definition */}
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Nodes */}
      {nodes.map((node, index) => {
        const position = nodePositions[index];
        if (!position) return null;
        
        return (
          <SnakeNode
            key={node.id}
            node={node}
            position={position}
            index={index}
            onClick={() => onNodeClick?.(node)}
          />
        );
      })}
    </div>
  );
}

interface SnakeNodeProps {
  node: PathNode;
  position: { x: number; y: number };
  index: number;
  onClick: () => void;
}

function SnakeNode({ node, position, index, onClick }: SnakeNodeProps) {
  const isLocked = node.type === 'locked';
  const isCheckpoint = node.type === 'checkpoint';
  const isCurrent = node.current;
  
  const nodeSize = isCheckpoint ? 80 : 60;
  
  return (
    <motion.div
      className="absolute"
      style={{
        left: position.x - nodeSize / 2,
        top: position.y - nodeSize / 2,
        width: nodeSize,
        height: nodeSize,
        zIndex: 10
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ 
        delay: index * 0.1,
        type: "spring",
        stiffness: 260,
        damping: 20
      }}
    >
      <button
        onClick={onClick}
        disabled={isLocked}
        className={`
          relative w-full h-full rounded-full
          transition-all duration-300
          ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-110'}
          ${isCurrent ? 'animate-pulse' : ''}
        `}
      >
        {/* Node background */}
        <div
          className={`
            absolute inset-0 rounded-full
            ${isLocked ? 'bg-gray-300' : ''}
            ${isCheckpoint ? 'bg-gradient-to-br from-yellow-400 to-amber-500' : ''}
            ${!isLocked && !isCheckpoint && node.completed ? 'bg-gradient-to-br from-green-400 to-emerald-500' : ''}
            ${!isLocked && !isCheckpoint && !node.completed ? 'bg-gradient-to-br from-purple-400 to-violet-500' : ''}
          `}
        >
          {/* Inner shadow for depth */}
          <div className="absolute inset-1 rounded-full bg-black/10" />
        </div>
        
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
            <span className="text-2xl">{node.icon}</span>
          ) : isCheckpoint ? (
            <span className="text-3xl">⭐</span>
          ) : (
            <span className="text-2xl text-white font-bold">
              {node.completed ? '✓' : index + 1}
            </span>
          )}
        </div>
        
        {/* Node label */}
        {(node.title || node.subtitle) && (
          <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 text-center whitespace-nowrap">
            {node.title && (
              <div className="text-sm font-semibold text-foreground bg-background/90 px-2 py-1 rounded">
                {node.title}
              </div>
            )}
            {node.subtitle && (
              <div className="text-xs text-muted-foreground">
                {node.subtitle}
              </div>
            )}
          </div>
        )}
      </button>
    </motion.div>
  );
}