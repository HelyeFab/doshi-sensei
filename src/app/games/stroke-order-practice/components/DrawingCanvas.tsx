'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface Point {
  x: number;
  y: number;
}

interface Props {
  kanji: string;
  strokePaths: string[];
  correctStrokes: number[];
  onStrokeComplete: (strokeIndex: number, accuracy: number) => void;
  showHint: boolean;
  currentStrokeIndex: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
}

export default function DrawingCanvas({
  kanji,
  strokePaths,
  correctStrokes,
  onStrokeComplete,
  showHint,
  currentStrokeIndex,
  difficulty,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 320;
    canvas.height = 320;

    // Configure drawing style
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    setContext(ctx);
    redrawCanvas(ctx);
  }, [strokePaths, correctStrokes]);

  const redrawCanvas = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, 320, 320);

    // Draw grid
    ctx.strokeStyle = 'rgb(209, 213, 219)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(160, 0);
    ctx.lineTo(160, 320);
    ctx.moveTo(0, 160);
    ctx.lineTo(320, 160);
    ctx.stroke();

    // Draw border
    ctx.strokeRect(0, 0, 320, 320);

    // Draw completed strokes
    correctStrokes.forEach((strokeIndex) => {
      drawStroke(ctx, strokePaths[strokeIndex], 'rgb(34, 197, 94)', 1);
    });

    // Draw hint for next stroke
    if (showHint && currentStrokeIndex < strokePaths.length) {
      drawStroke(ctx, strokePaths[currentStrokeIndex], 'rgb(99, 102, 241)', 0.5);
    }

    // Draw remaining strokes (faded)
    const opacity = difficulty === 'easy' ? 0.3 : difficulty === 'medium' ? 0.2 : difficulty === 'hard' ? 0.1 : 0.05;
    strokePaths.forEach((path, index) => {
      if (!correctStrokes.includes(index) && index !== currentStrokeIndex) {
        drawStroke(ctx, path, 'rgb(156, 163, 175)', opacity);
      }
    });
  };

  const drawStroke = (ctx: CanvasRenderingContext2D, pathData: string, color: string, opacity: number) => {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;

    const path = new Path2D(pathData);
    // Scale path from 109x109 viewBox to 320x320 canvas
    ctx.scale(320 / 109, 320 / 109);
    ctx.stroke(path);
    ctx.restore();
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY;

    if (clientX === undefined || clientY === undefined) return null;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCoordinates(e);
    if (!coords || !context) return;

    setIsDrawing(true);
    setCurrentPath([coords]);

    context.strokeStyle = 'rgb(59, 130, 246)'; // Blue for drawing
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(coords.x, coords.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !context) return;

    const coords = getCoordinates(e);
    if (!coords) return;

    setCurrentPath(prev => [...prev, coords]);
    context.lineTo(coords.x, coords.y);
    context.stroke();
  };

  const endDrawing = () => {
    if (!isDrawing || !context) return;

    setIsDrawing(false);

    // Compare drawn path with expected stroke
    if (currentPath.length > 5) {
      const accuracy = comparePathWithStroke(currentPath, strokePaths[currentStrokeIndex]);
      
      if (accuracy > 0.6) { // 60% accuracy threshold
        onStrokeComplete(currentStrokeIndex, accuracy);
      } else {
        // Flash red for incorrect
        context.strokeStyle = 'rgb(239, 68, 68)';
        context.globalAlpha = 0.5;
        context.stroke();
        
        setTimeout(() => {
          redrawCanvas(context);
        }, 500);
      }
    }

    setCurrentPath([]);
  };

  const comparePathWithStroke = (drawnPath: Point[], strokePath: string): number => {
    // Simple comparison based on start and end points
    // In a real implementation, you'd use a more sophisticated algorithm
    if (drawnPath.length < 2) return 0;

    const firstPoint = drawnPath[0];
    const lastPoint = drawnPath[drawnPath.length - 1];

    // Parse the SVG path to get start and end points
    const pathCommands = strokePath.match(/[MLCQSTHVZmlcqsthvz][^MLCQSTHVZmlcqsthvz]*/g) || [];
    if (pathCommands.length === 0) return 0;

    // Extract first move command
    const firstCommand = pathCommands[0];
    const coords = firstCommand.match(/-?\d+\.?\d*/g) || [];
    if (coords.length < 2) return 0;

    const strokeStart = {
      x: parseFloat(coords[0]) * (320 / 109),
      y: parseFloat(coords[1]) * (320 / 109),
    };

    // Get last coordinate from path
    const lastCoords = pathCommands[pathCommands.length - 1].match(/-?\d+\.?\d*/g) || [];
    const strokeEnd = {
      x: parseFloat(lastCoords[lastCoords.length - 2]) * (320 / 109),
      y: parseFloat(lastCoords[lastCoords.length - 1]) * (320 / 109),
    };

    // Calculate distances
    const startDist = Math.sqrt(
      Math.pow(firstPoint.x - strokeStart.x, 2) + Math.pow(firstPoint.y - strokeStart.y, 2)
    );
    const endDist = Math.sqrt(
      Math.pow(lastPoint.x - strokeEnd.x, 2) + Math.pow(lastPoint.y - strokeEnd.y, 2)
    );

    // Simple accuracy based on how close start and end points are
    const maxDist = 50; // pixels
    const startAccuracy = Math.max(0, 1 - startDist / maxDist);
    const endAccuracy = Math.max(0, 1 - endDist / maxDist);

    return (startAccuracy + endAccuracy) / 2;
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="border-2 border-border rounded-lg bg-background cursor-crosshair touch-none"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={endDrawing}
      />
      
      {/* Stroke counter */}
      <div className="absolute top-2 right-2 bg-background/80 text-foreground border border-border px-2 py-1 rounded text-sm">
        {correctStrokes.length} / {strokePaths.length}
      </div>

      {/* Instructions */}
      {difficulty === 'easy' && (
        <div className="absolute bottom-2 left-2 text-xs text-muted-foreground">
          Draw stroke {currentStrokeIndex + 1}
        </div>
      )}
    </div>
  );
}