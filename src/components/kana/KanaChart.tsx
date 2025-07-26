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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic']));
  const basicKana = getBasicKana();
  const digraphs = getDigraphs();
  
  // Get dakuten (voiced) and handakuten (semi-voiced) characters
  const dakutenRows = ['g', 'z', 'd', 'b'];
  const handakutenRows = ['p'];
  const dakutenKana = basicKana.filter(k => dakutenRows.includes(k.row));
  const handakutenKana = basicKana.filter(k => handakutenRows.includes(k.row));

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const handleSpeak = async (kana: KanaCharacter) => {
    try {
      setPlayingId(kana.id);
      const character = chartType === 'hiragana' ? kana.hiragana : kana.katakana;

      // Use local audio files first, then fall back to Google TTS
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

            {/* Selection indicator - clickable */}
            <div
              className={`absolute top-0 left-0 w-3.5 h-3.5 rounded-tl-md rounded-br-lg transition-all cursor-pointer ${
                isSelected
                  ? 'bg-purple-500'
                  : 'bg-purple-200 hover:bg-purple-300'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleKana(kana.id);
              }}
            >
              {isSelected && (
                <div className="w-full h-full flex items-center justify-center pointer-events-none">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>


      </div>
    );
  };

  const renderBasicChart = () => {
    const columns = ['a', 'i', 'u', 'e', 'o'];
    const isExpanded = expandedSections.has('basic');
    // Filter out dakuten and handakuten characters
    const pureBasicKana = basicKana.filter(k => !dakutenRows.includes(k.row) && !handakutenRows.includes(k.row));

    return (
      <div className="mb-6 w-full">
        <div 
          className="flex items-center justify-between p-4 bg-card rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleSection('basic')}
        >
          <h3 className="text-lg sm:text-xl font-semibold text-card-foreground">
            Basic {chartType === 'hiragana' ? 'Hiragana' : 'Katakana'}
          </h3>
          <svg 
            className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        
        {isExpanded && (
          <div className="mt-4 w-full max-w-xl mx-auto">
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2 md:gap-3">
            {/* Header row */}
            {columns.map(col => (
              <div key={`header-${col}`} className="flex items-center justify-center h-8 text-xs sm:text-sm font-semibold text-muted-foreground bg-muted/30 rounded">
                {col.toUpperCase()}
              </div>
            ))}

          {/* Kana rows */}
          {kanaRowOrder.filter(row => !dakutenRows.includes(row) && !handakutenRows.includes(row)).map(row => {
            const rowKana = pureBasicKana.filter(k => k.row === row);

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
        )}
      </div>
    );
  };

  const renderDakutenChart = () => {
    const columns = ['a', 'i', 'u', 'e', 'o'];
    const isExpanded = expandedSections.has('dakuten');

    return (
      <div className="w-full">
        <div 
          className="flex items-center justify-between p-4 bg-card rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleSection('dakuten')}
        >
          <h3 className="text-lg sm:text-xl font-semibold text-card-foreground">
            Dakuten (Voiced)
          </h3>
          <svg 
            className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        
        {isExpanded && (
          <div className="mt-4 w-full max-w-xl mx-auto">
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2 md:gap-3">
              {/* Header row */}
              {columns.map(col => (
                <div key={`dakuten-header-${col}`} className="flex items-center justify-center h-8 text-xs sm:text-sm font-semibold text-muted-foreground bg-muted/30 rounded">
                  {col.toUpperCase()}
                </div>
              ))}

              {/* Dakuten rows */}
              {dakutenRows.map(row => {
                const rowKana = dakutenKana.filter(k => k.row === row);
                return (
                  <React.Fragment key={`dakuten-${row}`}>
                    {columns.map(col => {
                      const kana = rowKana.find(k => k.column === col);
                      return <div key={`${row}-${col}`}>{renderKanaCell(kana || null)}</div>;
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderHandakutenChart = () => {
    const columns = ['a', 'i', 'u', 'e', 'o'];
    const isExpanded = expandedSections.has('handakuten');

    return (
      <div className="w-full">
        <div 
          className="flex items-center justify-between p-4 bg-card rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleSection('handakuten')}
        >
          <h3 className="text-lg sm:text-xl font-semibold text-card-foreground">
            Handakuten (Semi-voiced)
          </h3>
          <svg 
            className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        
        {isExpanded && (
          <div className="mt-4 w-full max-w-xl mx-auto">
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2 md:gap-3">
              {/* Header row */}
              {columns.map(col => (
                <div key={`handakuten-header-${col}`} className="flex items-center justify-center h-8 text-xs sm:text-sm font-semibold text-muted-foreground bg-muted/30 rounded">
                  {col.toUpperCase()}
                </div>
              ))}

              {/* Handakuten row (only pa, pi, pu, pe, po) */}
              {handakutenRows.map(row => {
                const rowKana = handakutenKana.filter(k => k.row === row);
                return (
                  <React.Fragment key={`handakuten-${row}`}>
                    {columns.map(col => {
                      const kana = rowKana.find(k => k.column === col);
                      return <div key={`${row}-${col}`}>{renderKanaCell(kana || null)}</div>;
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDigraphChart = () => {
    const columns = ['a', 'u', 'o'];
    const isExpanded = expandedSections.has('digraphs');

    return (
      <div className="w-full">
        <div 
          className="flex items-center justify-between p-4 bg-card rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleSection('digraphs')}
        >
          <h3 className="text-lg sm:text-xl font-semibold text-card-foreground">
            Digraphs (Yōon)
          </h3>
          <svg 
            className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        
        {isExpanded && (
          <div className="mt-4 w-full max-w-sm mx-auto">
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
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="space-y-4">
        {renderBasicChart()}
        {renderDakutenChart()}
        {renderHandakutenChart()}
        {renderDigraphChart()}
      </div>
    </div>
  );
}
