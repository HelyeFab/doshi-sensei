'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useMoodBoards } from '@/hooks/useMoodBoards';
import { MoodBoard as MoodBoardType } from '@/types/moodBoard';

interface KanjiSimonBoardSelectionProps {
  onSelect: (boardId: string) => void;
}

export default function KanjiSimonBoardSelection({ onSelect }: KanjiSimonBoardSelectionProps) {
  const { moodBoards, loading } = useMoodBoards();
  const [filteredBoards, setFilteredBoards] = useState<MoodBoardType[]>([]);

  useEffect(() => {
    // Filter active boards with kanji
    const activeBoards = moodBoards.filter(board => 
      board.isActive !== false && 
      board.kanji && 
      board.kanji.length > 0
    );
    setFilteredBoards(activeBoards);
  }, [moodBoards]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-muted-foreground">Loading mood boards...</p>
        </div>
      </div>
    );
  }

  if (filteredBoards.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">📚</div>
        <h3 className="text-xl font-semibold mb-2">No Mood Boards Available</h3>
        <p className="text-muted-foreground">
          There are no active mood boards with kanji to practice.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredBoards.map((board, index) => (
        <motion.button
          key={board.id}
          onClick={() => onSelect(board.id)}
          className="group relative overflow-hidden rounded-xl border-2 border-border hover:border-primary transition-all duration-300 hover:shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Background gradient */}
          <div 
            className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity"
            style={{ background: board.background }}
          />
          
          {/* Content */}
          <div className="relative p-6 text-left">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-foreground mb-1">
                  {board.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {board.jlpt && `JLPT ${board.jlpt} • `}
                  {board.kanji.length} kanji
                </p>
              </div>
              <div className="text-3xl">{board.emoji}</div>
            </div>
            
            {/* Kanji preview */}
            <div className="flex flex-wrap gap-2 mb-4">
              {board.kanji.slice(0, 5).map((kanji, i) => (
                <div
                  key={i}
                  className="w-8 h-8 bg-background/80 rounded flex items-center justify-center text-sm font-bold border border-border"
                >
                  {kanji.char}
                </div>
              ))}
              {board.kanji.length > 5 && (
                <div className="w-8 h-8 bg-background/80 rounded flex items-center justify-center text-xs text-muted-foreground border border-border">
                  +{board.kanji.length - 5}
                </div>
              )}
            </div>
            
            {/* Description */}
            <p className="text-sm text-muted-foreground line-clamp-2">
              {board.description}
            </p>
            
            {/* Play indicator */}
            <div className="mt-4 flex items-center gap-2 text-primary">
              <span className="text-sm font-medium">Play Kanji Simon</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
}