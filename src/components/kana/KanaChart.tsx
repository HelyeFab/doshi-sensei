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
      const textToSpeak = chartType === 'hiragana' ? kana.hiragana : kana.katakana;
      await TTSManager.speak(textToSpeak);
    } catch (error) {
      console.error('Error speaking kana:', error);
    } finally {
      setPlayingId(null);
    }
  };

  const renderKanaCell = (kana: KanaCharacter | null, isHeader = false) => {
    if (!kana) {
      return <div className="aspect-square" />;
    }

    const isSelected = selectedKana.has(kana.id);
    const character = chartType === 'hiragana' ? kana.hiragana : kana.katakana;

    if (isHeader) {
      return (
        <div className="aspect-square flex items-center justify-center text-sm font-medium text-muted-foreground">
          {kana.column.toUpperCase()}
        </div>
      );
    }

    return (
      <div
        className={`
          relative rounded-lg border-2 transition-all cursor-pointer
          ${isSelected 
            ? 'bg-primary/20 border-primary text-primary-foreground ring-2 ring-primary/50' 
            : 'bg-card border-border text-card-foreground hover:bg-muted hover:border-muted-foreground/50'
          }
        `}
        onClick={() => onToggleKana(kana.id)}
      >
        <div className="relative flex flex-col items-center justify-center p-2 md:p-3">
          {/* Character */}
          <div className="text-3xl md:text-4xl lg:text-5xl font-medium japanese-text leading-tight">
            {character}
          </div>
          
          {/* Romaji */}
          {showRomaji && (
            <div className="text-sm md:text-base text-muted-foreground mt-1">
              {kana.romaji}
            </div>
          )}

          {/* Speak button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSpeak(kana);
            }}
            className="absolute top-1 right-1 p-1.5 rounded-full bg-background/80 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all"
            disabled={playingId === kana.id}
          >
            {playingId === kana.id ? (
              <svg className="w-4 h-4 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              </svg>
            )}
          </button>

          {/* Selection indicator */}
          {isSelected && (
            <div className="absolute -top-1 -left-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}

          {/* Pronunciation note */}
          {kana.pronunciation && (
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-2 py-0.5 bg-yellow-500/20 rounded text-xs text-yellow-600 dark:text-yellow-400 whitespace-nowrap">
              {kana.pronunciation}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderBasicChart = () => {
    const columns = ['a', 'i', 'u', 'e', 'o'];
    
    return (
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-6 text-card-foreground">
          Basic {chartType === 'hiragana' ? 'Hiragana' : 'Katakana'}
        </h3>
        <div className="inline-block bg-card/50 backdrop-blur rounded-xl p-4 md:p-6 border border-border/50">
          <div className="grid grid-cols-5 gap-2 md:gap-3 lg:gap-4">
            {/* Header row */}
            {columns.map(col => (
              <div key={`header-${col}`} className="flex items-center justify-center h-12 md:h-14 text-sm md:text-base font-semibold text-muted-foreground bg-muted/30 rounded-lg">
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
                  <div key={`${row}-a`} className="aspect-square">{renderKanaCell(rowKana.find(k => k.column === 'a') || null)}</div>
                  <div key={`${row}-i`} className="aspect-square" />
                  <div key={`${row}-u`} className="aspect-square">{renderKanaCell(rowKana.find(k => k.column === 'u') || null)}</div>
                  <div key={`${row}-e`} className="aspect-square" />
                  <div key={`${row}-o`} className="aspect-square">{renderKanaCell(rowKana.find(k => k.column === 'o') || null)}</div>
                </React.Fragment>
              );
            } else if (row === 'w') {
              return (
                <React.Fragment key={row}>
                  <div key={`${row}-a`} className="aspect-square">{renderKanaCell(rowKana.find(k => k.column === 'a') || null)}</div>
                  <div key={`${row}-i`} className="aspect-square" />
                  <div key={`${row}-u`} className="aspect-square" />
                  <div key={`${row}-e`} className="aspect-square" />
                  <div key={`${row}-o`} className="aspect-square">{renderKanaCell(rowKana.find(k => k.column === 'o') || null)}</div>
                </React.Fragment>
              );
            } else if (row === 'special') {
              return (
                <React.Fragment key={row}>
                  <div key={`${row}-a`} className="aspect-square" />
                  <div key={`${row}-i`} className="aspect-square" />
                  <div key={`${row}-n`} className="aspect-square">{renderKanaCell(rowKana[0] || null)}</div>
                  <div key={`${row}-e`} className="aspect-square" />
                  <div key={`${row}-o`} className="aspect-square" />
                </React.Fragment>
              );
            }

            // Regular rows with 5 characters
            return (
              <React.Fragment key={row}>
                {columns.map(col => {
                  const kana = rowKana.find(k => k.column === col);
                  return <div key={`${row}-${col}`} className="aspect-square">{renderKanaCell(kana || null)}</div>;
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
      <div>
        <h3 className="text-xl font-semibold mb-6 text-card-foreground">
          Digraphs (Yōon) - {chartType === 'hiragana' ? 'Hiragana' : 'Katakana'}
        </h3>
        <div className="inline-block bg-card/50 backdrop-blur rounded-xl p-4 md:p-6 border border-border/50">
          <div className="grid grid-cols-3 gap-2 md:gap-3 lg:gap-4">
            {/* Header row */}
            {columns.map(col => (
              <div key={`digraph-header-${col}`} className="flex items-center justify-center h-12 md:h-14 text-sm md:text-base font-semibold text-muted-foreground bg-muted/30 rounded-lg">
                Y{col.toUpperCase()}
              </div>
            ))}

          {/* Digraph rows */}
          {digraphRowOrder.map(row => {
            const rowDigraphs = digraphs.filter(k => k.row === row);
            
            return columns.map(col => {
              const kana = rowDigraphs.find(k => k.column === col);
              return <div key={`${row}-${col}`} className="aspect-square">{renderKanaCell(kana || null)}</div>;
            });
          })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
      <div>{renderBasicChart()}</div>
      <div>{renderDigraphChart()}</div>
    </div>
  );
}