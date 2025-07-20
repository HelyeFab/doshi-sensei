import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';
import { ADMIN_EMAIL } from '@/types/admin';
import fs from 'fs';
import path from 'path';

// This route handles both development (auto-save) and production (copy-paste)

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const authHeader = headers().get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    
    try {
      const admin = await getFirebaseAdmin();
      const decodedToken = await admin.auth().verifyIdToken(token);
      if (decodedToken.email !== ADMIN_EMAIL) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (error) {
      console.error('Token verification error:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const data = await request.json();
    const { positions, nodes } = data;

    // Generate the new positions array string
    const positionsString = positions.map((pos: any, i: number) => 
      `  { x: ${pos.x.toFixed(1)}, y: ${pos.y} }, // ${nodes[i]?.title || `Node ${i}`}`
    ).join('\n');

    // Check if we're in development
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Try to auto-save in development
    if (isDevelopment) {
      try {
        let allUpdatesSuccessful = true;
        
        // Update ProductionSnakePath.tsx with positions
        const snakePathFile = path.join(process.cwd(), 'src/components/ProductionSnakePath.tsx');
        const snakePathContent = fs.readFileSync(snakePathFile, 'utf-8');
        
        const positionsRegex = /const PRODUCTION_POSITIONS = \[\n([\s\S]*?)\];/;
        const newPositionsArray = `const PRODUCTION_POSITIONS = [\n${positionsString}\n];`;
        
        if (positionsRegex.test(snakePathContent)) {
          const updatedSnakePathContent = snakePathContent.replace(positionsRegex, newPositionsArray);
          fs.writeFileSync(snakePathFile, updatedSnakePathContent, 'utf-8');
        } else {
          allUpdatesSuccessful = false;
        }
        
        // Update snake path nodes configuration file
        const nodesConfigFile = path.join(process.cwd(), 'src/config/snakePathNodes.ts');
        
        // Generate the nodes array string with pill positions
        const nodesString = nodes.map((node: any) => {
          const nodeStr = `  {
    id: '${node.id}',
    type: '${node.type}',
    icon: '${node.icon || ''}',
    title: '${node.title}',
    subtitle: '${node.subtitle || ''}'${node.completed ? ',\n    completed: true' : ''}${node.current ? ',\n    current: true' : ''}${node.href ? `,\n    href: '${node.href}'` : ''}${node.pillPosition ? `,\n    pillPosition: '${node.pillPosition}'` : ''}
  }`;
          return nodeStr;
        }).join(',\n');
        
        // Generate the complete configuration file content
        const nodesConfigContent = `// Shared configuration for snake path nodes
// This file is used by both the practice page and admin dashboard

export interface PathNode {
  id: string;
  type: 'lesson' | 'checkpoint' | 'locked';
  icon?: string;
  title: string;
  subtitle?: string;
  completed?: boolean;
  current?: boolean;
  href?: string;
  pillPosition?: 'left' | 'right' | 'top';
}

export const SNAKE_PATH_NODES: PathNode[] = [
${nodesString}
];`;
        
        fs.writeFileSync(nodesConfigFile, nodesConfigContent, 'utf-8');
        
        if (allUpdatesSuccessful) {
          return NextResponse.json({ 
            success: true,
            autoSaved: true,
            message: 'Files updated successfully! Next.js will hot-reload automatically.',
            positions: positions.length
          });
        } else {
          throw new Error('Could not update all files');
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
        // Fall through to manual mode
      }
    }

    // Read the current ProductionSnakePath file to preserve the complete implementation
    let currentFileContent = '';
    try {
      const filePath = path.join(process.cwd(), 'src/components/ProductionSnakePath.tsx');
      currentFileContent = fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      console.error('Could not read current file for reference:', error);
    }

    // Generate the complete file content with all features
    const fileContent = `'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

// Production positions from your adjustments
const PRODUCTION_POSITIONS = [
${positionsString}
];

interface PathNode {
  id: string;
  type: 'lesson' | 'checkpoint' | 'locked';
  icon?: string;
  title: string;
  subtitle?: string;
  completed?: boolean;
  current?: boolean;
  href?: string; // Link for navigation
  pillPosition?: 'left' | 'right' | 'top';
}

interface ProductionSnakePathProps {
  nodes: PathNode[];
  onNodeClick?: (node: PathNode) => void;
  __testPositions?: Array<{ x: number; y: number }>; // For admin preview only
  __testRegularSize?: number; // For admin preview only
  __testCheckpointSize?: number; // For admin preview only
}

export function ProductionSnakePath({ nodes, onNodeClick, __testPositions, __testRegularSize, __testCheckpointSize }: ProductionSnakePathProps) {
  const router = useRouter();

  const handleNodeClick = (node: PathNode) => {
    if (node.type === 'locked') return;
    
    if (node.href) {
      router.push(node.href);
    } else if (onNodeClick) {
      onNodeClick(node);
    }
  };

  const totalHeight = PRODUCTION_POSITIONS[PRODUCTION_POSITIONS.length - 1].y + 200;

  // Generate smooth curve path
  const generatePath = () => {
    if (PRODUCTION_POSITIONS.length < 2) return '';
    
    let path = \`M \${PRODUCTION_POSITIONS[0].x} \${PRODUCTION_POSITIONS[0].y}\`;
    
    for (let i = 1; i < PRODUCTION_POSITIONS.length; i++) {
      const prev = PRODUCTION_POSITIONS[i - 1];
      const curr = PRODUCTION_POSITIONS[i];
      
      // Create smooth bezier curves
      const cp1x = prev.x;
      const cp1y = prev.y + 70;
      const cp2x = curr.x;
      const cp2y = curr.y - 70;
      
      path += \` C \${cp1x} \${cp1y}, \${cp2x} \${cp2y}, \${curr.x} \${curr.y}\`;
    }
    
    return path;
  };

  return (
    <div 
      className="relative w-full"
      style={{ height: totalHeight }}
    >
      {/* Nodes */}
      {nodes.map((node, index) => {
        const position = __testPositions ? __testPositions[index] : PRODUCTION_POSITIONS[index];
        if (!position) return null;
        
        return (
          <motion.div
            key={node.id}
            className="absolute"
            style={{
              left: \`\${position.x}%\`,
              top: position.y,
              transform: 'translateX(-50%)'
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              delay: index * 0.08,
              type: "spring",
              stiffness: 260,
              damping: 20
            }}
          >
            <ProductionNode 
              node={node} 
              index={index}
              onClick={() => handleNodeClick(node)}
              regularSize={__testRegularSize}
              checkpointSize={__testCheckpointSize}
            />
          </motion.div>
        );
      })}
    </div>
  );
}

interface ProductionNodeProps {
  node: PathNode;
  index: number;
  onClick: () => void;
  regularSize?: number;
  checkpointSize?: number;
}

function ProductionNode({ node, index, onClick, regularSize, checkpointSize }: ProductionNodeProps) {
  const isLocked = node.type === 'locked';
  const isCheckpoint = node.type === 'checkpoint';
  const isCurrent = node.current;
  
  // Use test sizes if provided, otherwise use defaults
  const defaultRegularSize = 64; // w-16 h-16
  const defaultCheckpointSize = 80; // w-20 h-20
  const nodePixelSize = isCheckpoint 
    ? (checkpointSize || defaultCheckpointSize)
    : (regularSize || defaultRegularSize);
  
  // For backwards compatibility, use Tailwind classes when no custom size
  const nodeSize = !regularSize && !checkpointSize 
    ? (isCheckpoint ? 'w-20 h-20' : 'w-16 h-16')
    : '';
  
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        disabled={isLocked}
        className={\`
          relative \${nodeSize} rounded-full
          transition-all duration-300
          \${isLocked ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-110'}
          \${isCurrent ? 'animate-pulse' : ''}
        \`}
        style={regularSize || checkpointSize ? {
          width: \`\${nodePixelSize}px\`,
          height: \`\${nodePixelSize}px\`
        } : undefined}
      >
        {/* Glow effect on hover */}
        {!isLocked && (
          <div className={\`
            absolute -inset-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity
            bg-gradient-to-r \${isCheckpoint ? 'from-pink-200/20 to-pink-300/20' : 'from-pink-100/20 to-pink-200/20'}
            blur-xl
          \`} />
        )}
        
        
        {/* Node background with 3D coin appearance */}
        <div
          className={\`
            absolute inset-0 rounded-full transform transition-all
            \${isLocked ? 'bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400' : ''}
            \${isCheckpoint ? 'bg-gradient-to-br from-pink-100 via-pink-200 to-pink-300' : ''}
            \${!isLocked && !isCheckpoint && node.completed ? 'bg-gradient-to-br from-white via-pink-50 to-pink-100' : ''}
            \${!isLocked && !isCheckpoint && !node.completed ? 'bg-gradient-to-br from-pink-200 via-pink-300 to-pink-400' : ''}
            \${!isLocked && 'group-hover:shadow-2xl'}
          \`}
          style={{
            boxShadow: isLocked 
              ? '0 4px 8px rgba(0,0,0,0.1), inset 0 1px 2px rgba(255,255,255,0.6)' 
              : '0 4px 8px rgba(236,72,153,0.2), inset 0 1px 2px rgba(255,255,255,0.7)'
          }}
        />
        
        {/* Crescent shadow for 3D depth */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none overflow-hidden"
          style={{
            background: isLocked 
              ? 'radial-gradient(circle at 50% 30%, transparent 65%, rgba(0,0,0,0.15) 75%, rgba(0,0,0,0.25) 85%, rgba(0,0,0,0.35) 95%)'
              : isCheckpoint 
                ? 'radial-gradient(circle at 50% 30%, transparent 65%, rgba(236,72,153,0.2) 75%, rgba(236,72,153,0.3) 85%, rgba(236,72,153,0.4) 95%)'
                : node.completed
                  ? 'radial-gradient(circle at 50% 30%, transparent 65%, rgba(236,72,153,0.1) 75%, rgba(236,72,153,0.2) 85%, rgba(236,72,153,0.3) 95%)'
                  : 'radial-gradient(circle at 50% 30%, transparent 65%, rgba(236,72,153,0.25) 75%, rgba(236,72,153,0.35) 85%, rgba(236,72,153,0.45) 95%)'
          }}
        />
        
        {/* Subtle shine effect */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.2) 50%, transparent 60%)',
          }}
        />
        
        {/* Pulse ring animation for all nodes */}
        {!isLocked && (
          <div 
            className={\`absolute inset-0 rounded-full border-2 md:border-4 animate-pulse-ring \${
              isCheckpoint ? 'border-pink-200/70' : 
              node.completed ? 'border-pink-100/70' : 
              'border-pink-300/70'
            }\`}
          />
        )}
        
        {/* Current node indicator */}
        {isCurrent && (
          <div className="absolute -inset-2 rounded-full border-4 border-pink-400 animate-pulse" />
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
          {/* Inner coin rim effect */}
          <div className="absolute inset-2 rounded-full" style={{
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(255,255,255,0.5)'
          }}></div>
          
          {/* Icon content */}
          <div className="relative z-10">
            {isLocked ? (
              <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            ) : node.icon ? (
              <span className={\`\${isCheckpoint ? 'text-3xl' : 'text-2xl'}\`}>{node.icon}</span>
            ) : (
              <span className="text-xl text-white font-bold">
                {node.completed ? '✓' : index + 1}
              </span>
            )}
          </div>
        </div>
      </button>
      
      {/* Node label pill - positioned based on pillPosition prop */}
      {node.title && !isLocked && node.pillPosition && (
        <motion.div 
          className={\`
            absolute
            \${
              node.pillPosition === 'top' 
                ? '-top-20 left-1/2 -translate-x-1/2' 
                : node.pillPosition === 'right' 
                  ? '-right-28 md:-right-32 top-1/2 -translate-y-1/2' 
                  : '-left-28 md:-left-32 top-1/2 -translate-y-1/2'
            }
          \`}
          initial={{ 
            opacity: 0, 
            x: node.pillPosition === 'top' ? 0 : (node.pillPosition === 'right' ? 20 : -20),
            y: node.pillPosition === 'top' ? -10 : 0
          }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ delay: index * 0.08 + 0.2, duration: 0.5 }}
        >
          <div className="bg-primary text-white text-xs md:text-sm font-medium px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap transition-all hover:shadow-xl hover:scale-105">
            {node.title}
          </div>
        </motion.div>
      )}
    </div>
  );
}
`;

    // Return the file content and instructions
    return NextResponse.json({ 
      success: true,
      fileContent,
      instructions: 'Copy the fileContent and save it to /src/components/ProductionSnakePath.tsx'
    });
  } catch (error) {
    console.error('Error updating snake path:', error);
    return NextResponse.json(
      { error: 'Failed to generate snake path content' },
      { status: 500 }
    );
  }
}