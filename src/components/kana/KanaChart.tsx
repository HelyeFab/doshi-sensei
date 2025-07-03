'use client';

import React, { useState, useRef } from 'react';
import { KanaCharacter, getBasicKana, getDigraphs, kanaRowOrder, digraphRowOrder } from '@/data/kanaData';
import TTSManager from '@/utils/tts';

interface KanaChartProps {
  chartType: 'hiragana' | 'katakana';
  selectedKana: Set<string>;
  onToggleKana: (kanaId: string) => void;
  showRomaji?: boolean;
}

export default function KanaChart({ chartType, selectedKana, onToggleKana, showRomaji = true }: KanaChartProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const basicKana = getBasicKana();
  const digraphs = getDigraphs();

  const handleSpeak = async (kana: KanaCharacter) => {
    try {
      setPlayingId(kana.id);
      const character = chartType === 'hiragana' ? kana.hiragana : kana.katakana;
      
      // Use Google TTS for single kana characters
      await TTSManager.speak(character, {
        voice: 'female',
        provider: 'google'
      });
    } catch (error) {
      console.error('Error speaking kana:', error);
    } finally {
      setPlayingId(null);
    }
  };

  const renderKanaCell = (kana: KanaCharacter | null, isHeader = false) => {
    if (!kana) {
      return <div className="w-full" />;
    }

    const isSelected = selectedKana.has(kana.id);
    const character = chartType === 'hiragana' ? kana.hiragana : kana.katakana;

    if (isHeader) {
      return (
        <div className="flex items-center justify-center h-8 text-sm font-medium text-muted-foreground">
          {kana.column.toUpperCase()}
        </div>
      );
    }

    return (
      <div className="relative">
        <div
          className={`
            relative rounded-lg border-2 transition-all cursor-pointer overflow-hidden
            ${isSelected 
              ? 'bg-primary/20 border-primary text-primary-foreground ring-2 ring-primary/50' 
              : 'bg-card border-border text-card-foreground hover:bg-muted hover:border-muted-foreground/50'
            }
          `}
          onClick={() => handleSpeak(kana)}
        >
          <div className="relative flex flex-col items-center justify-center p-2 aspect-square">
            {/* Main content wrapper */}
            <div className="flex-1 flex flex-col items-center justify-center">
              {/* Character */}
              <div className="text-2xl sm:text-3xl md:text-4xl font-medium japanese-text">
                {character}
              </div>
              
              {/* Romaji */}
              {showRomaji && (
                <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {kana.romaji}
                </div>
              )}
            </div>

            {/* Selection indicator with clickable area */}
            <div 
              className={`absolute top-0 left-0 w-3.5 h-3.5 rounded-tl-md rounded-br-lg transition-all ${
                isSelected 
                  ? 'bg-purple-500 hover:bg-purple-600' 
                  : 'bg-purple-200 hover:bg-purple-300'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleKana(kana.id);
              }}
            >
              {isSelected && (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Pronunciation note - Outside the card */}
        {kana.pronunciation && (
          <div className="mt-1 px-1">
            <div className="bg-yellow-500/20 rounded px-1 py-0.5 text-[10px] sm:text-xs text-yellow-600 dark:text-yellow-400 text-center">
              {kana.pronunciation}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderBasicChart = () => {
    const columns = ['a', 'i', 'u', 'e', 'o'];
    
    return (
      <div className="mb-8 w-full">
        <h3 className="text-lg sm:text-xl font-semibold mb-4 text-card-foreground">
          Basic {chartType === 'hiragana' ? 'Hiragana' : 'Katakana'}
        </h3>
        <div className="w-full max-w-xl mx-auto">
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2 md:gap-3">
            {/* Header row */}
            {columns.map(col => (
              <div key={`header-${col}`} className="flex items-center justify-center h-8 text-xs sm:text-sm font-semibold text-muted-foreground bg-muted/30 rounded">
                {col.toUpperCase()}
              </div>
            ))}

          {/* Kana rows */}
          {kanaRowOrder.map(row => {
            const rowKana = basicKana.filter(k => k.row === row);
            
            // Special handling for rows with fewer than 5 characters
            if (row === 'y') {
              return (
                <React.Fragment key={row}>
                  <div>{renderKanaCell(rowKana.find(k => k.column === 'a') || null)}</div>
                  <div className="w-full" />
                  <div>{renderKanaCell(rowKana.find(k => k.column === 'u') || null)}</div>
                  <div className="w-full" />
                  <div>{renderKanaCell(rowKana.find(k => k.column === 'o') || null)}</div>
                </React.Fragment>
              );
            } else if (row === 'w') {
              return (
                <React.Fragment key={row}>
                  <div>{renderKanaCell(rowKana.find(k => k.column === 'a') || null)}</div>
                  <div className="w-full" />
                  <div className="w-full" />
                  <div className="w-full" />
                  <div>{renderKanaCell(rowKana.find(k => k.column === 'o') || null)}</div>
                </React.Fragment>
              );
            } else if (row === 'special') {
              return (
                <React.Fragment key={row}>
                  <div className="w-full" />
                  <div className="w-full" />
                  <div>{renderKanaCell(rowKana[0] || null)}</div>
                  <div className="w-full" />
                  <div className="w-full" />
                </React.Fragment>
              );
            }

            // Regular rows with 5 characters
            return (
              <React.Fragment key={row}>
                {columns.map(col => {
                  const kana = rowKana.find(k => k.column === col);
                  return <div key={`${row}-${col}`}>{renderKanaCell(kana || null)}</div>;
                })}
              </React.Fragment>
            );
          })}
          </div>
        </div>
      </div>
    );
  };

  const renderDigraphChart = () => {
    const columns = ['a', 'u', 'o'];
    
    return (
      <div className="w-full">
        <h3 className="text-lg sm:text-xl font-semibold mb-4 text-card-foreground">
          Digraphs (Yōon)
        </h3>
        <div className="w-full max-w-sm mx-auto">
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 md:gap-3">
            {/* Header row */}
            {columns.map(col => (
              <div key={`digraph-header-${col}`} className="flex items-center justify-center h-8 text-xs sm:text-sm font-semibold text-muted-foreground bg-muted/30 rounded">
                Y{col.toUpperCase()}
              </div>
            ))}

          {/* Digraph rows */}
          {digraphRowOrder.map(row => {
            const rowDigraphs = digraphs.filter(k => k.row === row);
            
            return (
              <React.Fragment key={row}>
                {columns.map(col => {
                  const kana = rowDigraphs.find(k => k.column === col);
                  return <div key={`${row}-${col}`}>{renderKanaCell(kana || null)}</div>;
                })}
              </React.Fragment>
            );
          })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start justify-center">
        <div className="w-full lg:w-auto">{renderBasicChart()}</div>
        <div className="w-full lg:w-auto">{renderDigraphChart()}</div>
      </div>
    </div>
  );
}