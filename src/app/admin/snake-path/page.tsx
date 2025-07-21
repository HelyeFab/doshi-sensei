'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useRouter } from 'next/navigation';
import { ProductionSnakePath } from '@/components/ProductionSnakePath';
import { useAuth } from '@/contexts/AuthContext';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import { SNAKE_PATH_NODES } from '@/config/snakePathNodes';

// Prevent static generation for admin pages
export const dynamic = 'force-dynamic';

// Default positions from ProductionSnakePath
const DEFAULT_POSITIONS = [
  { x: 39.0, y: 50 },
  { x: 46.0, y: 190 },
  { x: 38.0, y: 330 },
  { x: 43.0, y: 470 },
  { x: 40.0, y: 610 },
  { x: 47.0, y: 750 },
  { x: 57.0, y: 890 },
  { x: 51.0, y: 1030 },
  { x: 41.0, y: 1170 },
  { x: 44.0, y: 1310 },
  { x: 51.0, y: 1450 },
  { x: 59.0, y: 1590 },
  { x: 52.0, y: 1730 },
  { x: 44.0, y: 1870 },
  { x: 49.0, y: 2010 },
];


type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'bigscreen';

interface PathNode {
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

interface NodePosition {
  x: number;
  y: number;
}

interface ResponsivePositions {
  mobile: NodePosition[];
  tablet: NodePosition[];
  desktop: NodePosition[];
  bigscreen: NodePosition[];
}

function SnakePathEditor() {
  const router = useRouter();
  const { user } = useAuth();
  const [nodes, setNodes] = useState<PathNode[]>(SNAKE_PATH_NODES);
  const [nodeSpacing] = useState(140);
  const [selectedDevice, setSelectedDevice] = useState<DeviceType>('desktop');
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Node size controls
  const [regularNodeSize, setRegularNodeSize] = useState(64); // Default 64px (w-16 h-16)
  const [checkpointNodeSize, setCheckpointNodeSize] = useState(80); // Default 80px (w-20 h-20)
  
  const [responsivePositions, setResponsivePositions] = useState<ResponsivePositions>(() => {
    const basePositions = DEFAULT_POSITIONS.slice(0, nodes.length);
    return {
      mobile: basePositions.map(p => ({ ...p })),
      tablet: basePositions.map(p => ({ ...p })),
      desktop: basePositions.map(p => ({ ...p })),
      bigscreen: basePositions.map(p => ({ ...p }))
    };
  });

  useEffect(() => {
    setResponsivePositions(prev => {
      const newPositions = { ...prev };
      
      (Object.keys(newPositions) as DeviceType[]).forEach(device => {
        const currentLength = newPositions[device].length;
        const targetLength = nodes.length;
        
        if (currentLength < targetLength) {
          for (let i = currentLength; i < targetLength; i++) {
            const lastPos = newPositions[device][i - 1] || { x: 50, y: 0 };
            newPositions[device].push({
              x: 40 + (Math.sin(i * 0.5) * 20),
              y: lastPos.y + nodeSpacing
            });
          }
        } else if (currentLength > targetLength) {
          newPositions[device] = newPositions[device].slice(0, targetLength);
        }
      });
      
      return newPositions;
    });
  }, [nodes.length, nodeSpacing]);

  const currentPositions = responsivePositions[selectedDevice];

  const updateNodePosition = (index: number, x: number) => {
    setResponsivePositions(prev => ({
      ...prev,
      [selectedDevice]: prev[selectedDevice].map((pos, i) => 
        i === index ? { ...pos, x } : pos
      )
    }));
  };

  const addNode = () => {
    const newNodeNumber = nodes.filter(n => n.id.startsWith('dummy')).length + 1;
    const newNode: PathNode = {
      id: `dummy${newNodeNumber + 5}`,
      type: 'lesson',
      icon: `${newNodeNumber + 5}`,
      title: `Lesson ${newNodeNumber + 5}`,
      subtitle: 'Coming Soon',
      completed: false,
      pillPosition: nodes.length % 2 === 0 ? 'left' : 'right'
    };
    
    setNodes([...nodes, newNode]);
  };

  const removeNode = () => {
    if (nodes.length > 1) {
      setNodes(nodes.slice(0, -1));
    }
  };

  const exportPositions = () => {
    console.log('// Responsive Snake Path Positions:');
    console.log('export const RESPONSIVE_POSITIONS = {');
    
    (Object.keys(responsivePositions) as DeviceType[]).forEach(device => {
      console.log(`  ${device}: [`);
      responsivePositions[device].forEach((pos, i) => {
        console.log(`    { x: ${pos.x.toFixed(1)}, y: ${pos.y} }, // ${nodes[i]?.title || `Node ${i}`}`);
      });
      console.log('  ],');
    });
    
    console.log('};');
    
    console.log('\n// For ProductionSnakePath.tsx:');
    console.log('const PRODUCTION_POSITIONS = [');
    currentPositions.forEach((pos, i) => {
      console.log(`  { x: ${pos.x.toFixed(1)}, y: ${pos.y} }, // ${nodes[i]?.title || `Node ${i}`}`);
    });
    console.log('];');
  };

  const handleSaveClick = () => {
    setShowSaveModal(true);
  };

  const saveToProduction = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    
    try {
      // Get the user's auth token
      const token = await user?.getIdToken();
      if (!token) {
        setSaveError('Authentication error. Please refresh the page.');
        return;
      }

      // Call the API to generate the file content
      const response = await fetch('/api/admin/update-snake-path', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          positions: currentPositions,
          responsivePositions,
          nodes
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update snake path');
      }

      // Check if file was auto-saved in development
      if (result.autoSaved) {
        setSaveSuccess(true);
        setShowSaveModal(false);
        
        // Show success modal
        setTimeout(() => {
          setShowSaveModal(true);
        }, 100);
        
        // Still export to console as backup
        console.log('=== BACKUP: Snake Path Positions ===');
        exportPositions();
        return;
      }

      // Otherwise, copy the file content to clipboard
      if (navigator.clipboard && result.fileContent) {
        await navigator.clipboard.writeText(result.fileContent);
        setSaveSuccess(true);
        setShowSaveModal(false);
        
        // Show success modal
        setTimeout(() => {
          setShowSaveModal(true);
        }, 100);
      } else {
        // Fallback: create a textarea and copy
        const textarea = document.createElement('textarea');
        textarea.value = result.fileContent;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        
        setSaveSuccess(true);
        setShowSaveModal(false);
        
        // Show success modal
        setTimeout(() => {
          setShowSaveModal(true);
        }, 100);
      }

      // Also export to console as backup
      console.log('=== BACKUP: Snake Path Positions ===');
      exportPositions();
    } catch (error) {
      console.error('Error saving positions:', error);
      setSaveError(error instanceof Error ? error.message : 'Unknown error');
      
      // Export to console as fallback
      exportPositions();
    } finally {
      setIsSaving(false);
    }
  };

  const totalHeight = nodes.length * nodeSpacing + 200;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <span>🐍</span> Snake Path Editor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Adjust the learning path positions for different screen sizes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Device Type
            </label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value as DeviceType)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="mobile">Mobile (&lt; 768px)</option>
              <option value="tablet">Tablet (768px - 1024px)</option>
              <option value="desktop">Desktop (1024px - 1920px)</option>
              <option value="bigscreen">Big Screen (&gt; 1920px)</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Manage Nodes ({nodes.length} total)
            </label>
            <div className="flex gap-2">
              <button
                onClick={addNode}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm"
              >
                Add Node
              </button>
              <button
                onClick={removeNode}
                disabled={nodes.length <= 1}
                className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 text-sm disabled:opacity-50"
              >
                Remove Last
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Actions
            </label>
            <div className="flex gap-2">
              <button
                onClick={exportPositions}
                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 text-sm"
              >
                Export to Console
              </button>
              <button
                onClick={handleSaveClick}
                disabled={isSaving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save to Production'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showPreview"
              checked={showPreview}
              onChange={(e) => setShowPreview(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="showPreview" className="text-sm text-muted-foreground">
              Show live preview
            </label>
          </div>
          
          {/* Node Size Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Regular Node Size: {regularNodeSize}px
              </label>
              <input
                type="range"
                min="40"
                max="100"
                value={regularNodeSize}
                onChange={(e) => setRegularNodeSize(Number(e.target.value))}
                className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>40px</span>
                <span>100px</span>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Checkpoint Node Size: {checkpointNodeSize}px
              </label>
              <input
                type="range"
                min="60"
                max="120"
                value={checkpointNodeSize}
                onChange={(e) => setCheckpointNodeSize(Number(e.target.value))}
                className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>60px</span>
                <span>120px</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            Adjust Positions - {selectedDevice.charAt(0).toUpperCase() + selectedDevice.slice(1)}
          </h3>
          
          <div 
            className="relative w-full bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 rounded-2xl overflow-hidden"
            style={{ height: totalHeight }}
          >
            <div className="absolute inset-0 pointer-events-none">
              {[20, 50, 80].map(x => (
                <div
                  key={x}
                  className="absolute top-0 bottom-0 w-px bg-border/30"
                  style={{ left: `${x}%` }}
                />
              ))}
            </div>

            {nodes.map((node, index) => {
              const position = currentPositions[index];
              if (!position) return null;

              return (
                <div key={node.id}>
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
                      regularSize={regularNodeSize}
                      checkpointSize={checkpointNodeSize}
                    />
                  </motion.div>

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
                        className="flex-1 h-2 bg-border rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-xs text-muted-foreground ml-1 min-w-[100px]">
                        {node.title}
                      </span>
                    </div>
                    
                    {/* Pill position controls */}
                    {node.type !== 'locked' && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">Pill:</span>
                        <div className="flex gap-1">
                          {(['left', 'right', 'top'] as const).map((position) => (
                            <button
                              key={position}
                              onClick={() => {
                                setNodes(prev => prev.map((n, i) => 
                                  i === index ? { ...n, pillPosition: position } : n
                                ));
                              }}
                              className={`px-2 py-1 text-xs rounded ${
                                node.pillPosition === position 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                              }`}
                            >
                              {position}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {showPreview && (
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Live Preview</h3>
            
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600/20 via-purple-500/10 to-transparent">
              <div className="relative z-10 p-8 max-h-[800px] overflow-y-auto">
                <ProductionSnakePath 
                  nodes={nodes}
                  __testPositions={currentPositions}
                  __testRegularSize={regularNodeSize}
                  __testCheckpointSize={checkpointNodeSize}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="text-sm font-semibold mb-2">Current Positions ({selectedDevice}):</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs font-mono">
          {currentPositions.map((pos, i) => (
            <div key={i} className="text-muted-foreground">
              {nodes[i]?.title}: {pos.x.toFixed(0)}%
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-white mb-2">Instructions:</h4>
        <ul className="text-sm text-white space-y-1 list-disc list-inside">
          <li>Select a device type to adjust positions for different screen sizes</li>
          <li>Use the sliders to adjust each node&apos;s horizontal position</li>
          <li>Add or remove nodes as needed</li>
          <li>The live preview shows how it will look on the practice page</li>
          <li>Click &quot;Save to Production&quot; to save changes:</li>
          <li className="ml-4">• In development: File updates automatically with hot-reload</li>
          <li className="ml-4">• In production: Code copies to clipboard for manual update</li>
        </ul>
      </div>

      {/* Save confirmation modal */}
      <ConfirmationDialog
        isOpen={showSaveModal && !saveSuccess && !saveError}
        title="Save Snake Path to Production"
        message="Are you sure you want to save these changes? The snake path positions and pill labels will be updated."
        confirmText="Save Changes"
        cancelText="Cancel"
        isDestructive={false}
        onConfirm={saveToProduction}
        onCancel={() => setShowSaveModal(false)}
        loading={isSaving}
      />

      {/* Success modal */}
      <ConfirmationDialog
        isOpen={showSaveModal && saveSuccess}
        title="✅ Success!"
        message={
          process.env.NODE_ENV === 'development'
            ? "The ProductionSnakePath.tsx file has been updated automatically. Next.js will hot-reload the changes momentarily."
            : "The updated ProductionSnakePath.tsx content has been copied to your clipboard.\n\nTo apply the changes:\n1. Open /src/components/ProductionSnakePath.tsx\n2. Select all (Ctrl/Cmd + A)\n3. Paste (Ctrl/Cmd + V)\n4. Save the file"
        }
        confirmText="OK"
        cancelText=""
        isDestructive={false}
        onConfirm={() => {
          setShowSaveModal(false);
          setSaveSuccess(false);
        }}
        onCancel={() => {}}
        loading={false}
      />

      {/* Error modal */}
      <ConfirmationDialog
        isOpen={showSaveModal && !!saveError}
        title="❌ Error"
        message={`Failed to save positions: ${saveError}\n\nCheck the console for manual export.`}
        confirmText="OK"
        cancelText=""
        isDestructive={true}
        onConfirm={() => {
          setShowSaveModal(false);
          setSaveError(null);
        }}
        onCancel={() => {}}
        loading={false}
      />
    </div>
  );
}

interface AdjustableNodeProps {
  node: PathNode;
  index: number;
  regularSize: number;
  checkpointSize: number;
}

function AdjustableNode({ node, index, regularSize, checkpointSize }: AdjustableNodeProps) {
  const isLocked = node.type === 'locked';
  const isCheckpoint = node.type === 'checkpoint';
  const isCurrent = node.current;
  
  const nodePixelSize = isCheckpoint ? checkpointSize : regularSize;
  
  return (
    <button
      disabled={isLocked}
      className={`
        relative rounded-full
        transition-all duration-300
        ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-110'}
        ${isCurrent ? 'animate-pulse' : ''}
      `}
      style={{
        width: `${nodePixelSize}px`,
        height: `${nodePixelSize}px`
      }}
    >
      <div
        className={`
          absolute inset-0 rounded-full shadow-lg
          ${isLocked ? 'bg-gray-300' : ''}
          ${isCheckpoint ? 'bg-gradient-to-br from-yellow-400 to-amber-500' : ''}
          ${!isLocked && !isCheckpoint && node.completed ? 'bg-gradient-to-br from-green-400 to-emerald-500' : ''}
          ${!isLocked && !isCheckpoint && !node.completed ? 'bg-gradient-to-br from-purple-400 to-violet-500' : ''}
        `}
      />
      
      {isCurrent && (
        <div className="absolute -inset-2 rounded-full border-4 border-purple-500 animate-pulse" />
      )}
      
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
      
      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground">
        #{index + 1}
      </div>
    </button>
  );
}

export default function AdminSnakePathPage() {
  return (
    <AdminGuard>
      <AdminLayout title="Snake Path Editor">
        <SnakePathEditor />
      </AdminLayout>
    </AdminGuard>
  );
}