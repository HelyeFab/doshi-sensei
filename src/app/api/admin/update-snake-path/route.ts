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
        // Path to the ProductionSnakePath.tsx file
        const filePath = path.join(process.cwd(), 'src/components/ProductionSnakePath.tsx');
        
        // Read the current file
        const currentContent = fs.readFileSync(filePath, 'utf-8');
        
        // Replace the PRODUCTION_POSITIONS array
        const regex = /const PRODUCTION_POSITIONS = \[\n([\s\S]*?)\];/;
        const newPositionsArray = `const PRODUCTION_POSITIONS = [\n${positionsString}\n];`;
        
        if (regex.test(currentContent)) {
          const updatedContent = currentContent.replace(regex, newPositionsArray);
          
          // Write the updated file
          fs.writeFileSync(filePath, updatedContent, 'utf-8');
          
          return NextResponse.json({ 
            success: true,
            autoSaved: true,
            message: 'File updated successfully! Next.js will hot-reload automatically.',
            positions: positions.length
          });
        } else {
          throw new Error('Could not find PRODUCTION_POSITIONS array in file');
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
        // Fall through to manual mode
      }
    }

    // Generate the complete file content for manual copy-paste
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
}

interface ProductionSnakePathProps {
  nodes: PathNode[];
  onNodeClick?: (node: PathNode) => void;
  __testPositions?: Array<{ x: number; y: number }>; // For admin preview only
}

export function ProductionSnakePath({ nodes, onNodeClick, __testPositions }: ProductionSnakePathProps) {
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
}

function ProductionNode({ node, index, onClick }: ProductionNodeProps) {
  const isLocked = node.type === 'locked';
  const isCheckpoint = node.type === 'checkpoint';
  const isCurrent = node.current;
  
  const nodeSize = isCheckpoint ? 'w-20 h-20' : 'w-16 h-16';
  
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
      >
        {/* Glow effect on hover */}
        {!isLocked && (
          <div className={\`
            absolute -inset-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity
            bg-gradient-to-r \${isCheckpoint ? 'from-yellow-400/20 to-amber-500/20' : 'from-primary/20 to-accent/20'}
            blur-xl
          \`} />
        )}
        
        {/* Node background */}
        <div
          className={\`
            absolute inset-0 rounded-full shadow-lg transform transition-all
            \${isLocked ? 'bg-gray-300' : ''}
            \${isCheckpoint ? 'bg-gradient-to-br from-yellow-400 to-amber-500' : ''}
            \${!isLocked && !isCheckpoint && node.completed ? 'bg-gradient-to-br from-green-400 to-emerald-500' : ''}
            \${!isLocked && !isCheckpoint && !node.completed ? 'bg-gradient-to-br from-purple-400 to-violet-500' : ''}
            \${!isLocked && 'group-hover:shadow-xl'}
          \`}
        />
        
        {/* Pulse ring animation for all nodes */}
        {!isLocked && (
          <div 
            className={\`absolute inset-0 rounded-full border-2 md:border-4 animate-pulse-ring \${
              isCheckpoint ? 'border-yellow-400/70' : 
              node.completed ? 'border-green-400/70' : 
              'border-purple-400/70'
            }\`}
          />
        )}
        
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
            <span className={\`\${isCheckpoint ? 'text-3xl' : 'text-2xl'}\`}>{node.icon}</span>
          ) : (
            <span className="text-xl text-white font-bold">
              {node.completed ? '✓' : index + 1}
            </span>
          )}
        </div>
      </button>
      
      {/* Node label - appears on hover */}
      <div className={\`
        absolute top-full mt-2 left-1/2 transform -translate-x-1/2 text-center
        transition-all duration-200 pointer-events-none
        \${isLocked ? 'opacity-50' : 'opacity-0 group-hover:opacity-100 group-hover:translate-y-1'}
      \`}>
        {node.title && (
          <div className="bg-background/90 backdrop-blur-sm px-3 py-1 rounded-lg shadow-lg border border-border whitespace-nowrap">
            <div className="text-sm font-semibold text-foreground">
              {node.title}
            </div>
            {node.subtitle && (
              <div className="text-xs text-muted-foreground">
                {node.subtitle}
              </div>
            )}
          </div>
        )}
      </div>
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