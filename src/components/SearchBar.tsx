'use client';

import { useState, useRef, useEffect } from 'react';

interface SearchBarProps<T = unknown> {
  placeholder?: string;
  suggestions?: T[];
  onSearch: (query: string) => void;
  onSelect?: (item: T) => void;
  getSuggestionLabel?: (item: T) => string;
  getSuggestionKey?: (item: T, index: number) => string;
  debounceMs?: number;
  className?: string;
  autoFocus?: boolean;
  clearOnSelect?: boolean;
}

export function SearchBar<T = unknown>({
  placeholder = 'Search...',
  suggestions = [],
  onSearch,
  onSelect,
  getSuggestionLabel = (item) => String(item),
  getSuggestionKey = (item, index) => String(index),
  debounceMs = 300,
  className = '',
  autoFocus = false,
  clearOnSelect = false,
}: SearchBarProps<T>) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    if (query.trim()) {
      debounceTimer.current = setTimeout(() => {
        onSearch(query);
      }, debounceMs);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, onSearch, debounceMs]);

  useEffect(() => {
    setShowSuggestions(isFocused && suggestions.length > 0 && query.length > 0);
  }, [isFocused, suggestions, query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        } else {
          onSearch(query);
          setShowSuggestions(false);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelectSuggestion = (item: T) => {
    const label = getSuggestionLabel(item);
    if (clearOnSelect) {
      setQuery('');
    } else {
      setQuery(label);
    }
    onSelect?.(item);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
    onSearch('');
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full px-4 py-2 pl-10 pr-10 text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        {query && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 flex items-center pr-3"
            aria-label="Clear search"
          >
            <svg
              className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((item, index) => (
            <button
              key={getSuggestionKey(item, index)}
              onClick={() => handleSelectSuggestion(item)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                index === selectedIndex
                  ? 'bg-gray-100 dark:bg-gray-700'
                  : ''
              }`}
            >
              <span className="text-gray-900 dark:text-white">
                {getSuggestionLabel(item)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}