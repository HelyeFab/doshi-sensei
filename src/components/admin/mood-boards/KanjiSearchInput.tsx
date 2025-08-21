'use client';

import { useState, useEffect, useRef } from 'react';
import { KanjiItem } from '@/types/moodBoard';
import { searchKanji, getRandomKanji } from '@/utils/kanjiSearch';

interface KanjiSearchInputProps {
  onSelect: (kanji: KanjiItem) => void;
  placeholder?: string;
  className?: string;
}

export function KanjiSearchInput({ 
  onSelect, 
  placeholder = "Search kanji by character, meaning, or reading...",
  className = ""
}: KanjiSearchInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KanjiItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim()) {
      const searchResults = searchKanji(query, 8);
      setResults(searchResults);
      setIsOpen(true);
      setSelectedIndex(-1);
    } else {
      // Show random suggestions when focused
      const randomKanji = getRandomKanji(6);
      setResults(randomKanji);
      setIsOpen(false);
    }
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSelect = (kanji: KanjiItem) => {
    onSelect(kanji);
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    if (query.trim() && results.length > 0) {
      setIsOpen(true);
    }
  };

  const handleInputBlur = () => {
    // Delay to allow click on results
    setTimeout(() => {
      setIsFocused(false);
    }, 200);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-4 py-2 pl-10 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {(isOpen || (isFocused && !query && results.length > 0)) && (
        <div
          ref={resultsRef}
          className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-80 overflow-y-auto"
        >
          {!query && results.length > 0 && isFocused && (
            <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border">
              💡 Quick suggestions (start typing to search)
            </div>
          )}
          
          {results.length === 0 && query && (
            <div className="px-4 py-3 text-center text-muted-foreground">
              <div className="text-2xl mb-2">🔍</div>
              <p className="text-sm">No kanji found for "{query}"</p>
              <p className="text-xs mt-1">Try searching by meaning, reading, or character</p>
            </div>
          )}

          {results.map((kanji, index) => (
            <div
              key={kanji.char}
              onClick={() => handleSelect(kanji)}
              className={`px-4 py-3 cursor-pointer border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors ${
                index === selectedIndex ? 'bg-muted' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold text-primary">{kanji.char}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{kanji.meaning}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    {kanji.readings.on.length > 0 && (
                      <span>On: {kanji.readings.on.slice(0, 2).join(', ')}</span>
                    )}
                    {kanji.readings.kun.length > 0 && (
                      <>
                        {kanji.readings.on.length > 0 && <span>•</span>}
                        <span>Kun: {kanji.readings.kun.slice(0, 2).join(', ')}</span>
                      </>
                    )}
                  </div>
                  {kanji.examples.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      Ex: {kanji.examples[0]}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {'⭐'.repeat(kanji.difficulty)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {query && results.length > 0 && (
            <div className="px-3 py-2 text-xs text-center text-muted-foreground border-t border-border">
              Use ↑↓ to navigate, Enter to select, Esc to close
            </div>
          )}
        </div>
      )}
    </div>
  );
}