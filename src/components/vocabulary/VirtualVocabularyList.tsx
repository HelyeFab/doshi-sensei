'use client';

import { useCallback, useRef, useEffect, memo, CSSProperties } from 'react';
import { FixedSizeList as List } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { lazyVocabularyLoader } from '@/services/vocabulary/lazyVocabularyLoader';
import { computationWorker } from '@/services/workers/computationWorker';

interface VirtualVocabularyListProps {
  lessonId: string;
  items?: any[]; // Optional pre-loaded items
  itemHeight?: number;
  threshold?: number; // When to trigger virtual scrolling
  onItemClick?: (item: any) => void;
  renderItem: (item: any, index: number) => React.ReactNode;
  className?: string;
}

// Memoized row component
const VocabularyRow = memo(({ 
  data, 
  index, 
  style 
}: { 
  data: any; 
  index: number; 
  style: CSSProperties;
}) => {
  const { items, renderItem, isItemLoaded, loadingIndexes } = data;
  
  // Show loading state
  if (!isItemLoaded(index) || loadingIndexes.has(index)) {
    return (
      <div style={style} className="flex items-center justify-center p-4">
        <div className="animate-pulse bg-gray-200 rounded h-8 w-full" />
      </div>
    );
  }
  
  const item = items[index];
  if (!item) return null;
  
  return (
    <div style={style}>
      {renderItem(item, index)}
    </div>
  );
});

VocabularyRow.displayName = 'VocabularyRow';

export function VirtualVocabularyList({
  lessonId,
  items: preloadedItems,
  itemHeight = 80,
  threshold = 50,
  onItemClick,
  renderItem,
  className = ''
}: VirtualVocabularyListProps) {
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const infiniteLoaderRef = useRef<InfiniteLoader>(null);
  
  // State for virtualized items
  const itemsRef = useRef<any[]>(preloadedItems || []);
  const loadedChunksRef = useRef<Set<number>>(new Set());
  const loadingIndexesRef = useRef<Set<number>>(new Set());
  const totalItemsRef = useRef<number>(0);
  
  // Process items through Web Worker when preloaded
  useEffect(() => {
    if (preloadedItems && preloadedItems.length > 0) {
      // Process vocabulary through worker for cleaning
      computationWorker.processVocabulary(preloadedItems).then(processed => {
        itemsRef.current = processed;
        if (infiniteLoaderRef.current) {
          infiniteLoaderRef.current.resetloadMoreItemsCache();
        }
      });
    }
  }, [preloadedItems]);
  
  // Check if we should use virtual scrolling
  const shouldVirtualize = !preloadedItems || preloadedItems.length > threshold;
  
  // Load more items callback
  const loadMoreItems = useCallback(async (startIndex: number, stopIndex: number) => {
    // Calculate which chunks we need
    const chunkSize = 50;
    const startChunk = Math.floor(startIndex / chunkSize);
    const endChunk = Math.floor(stopIndex / chunkSize);
    
    const promises: Promise<void>[] = [];
    
    for (let chunkIndex = startChunk; chunkIndex <= endChunk; chunkIndex++) {
      if (!loadedChunksRef.current.has(chunkIndex)) {
        loadedChunksRef.current.add(chunkIndex);
        
        // Mark indexes as loading
        const chunkStart = chunkIndex * chunkSize;
        const chunkEnd = Math.min(chunkStart + chunkSize, stopIndex + 1);
        for (let i = chunkStart; i < chunkEnd; i++) {
          loadingIndexesRef.current.add(i);
        }
        
        const promise = lazyVocabularyLoader
          .loadChunk(lessonId, chunkIndex, { 
            prefetchNext: true,
            cacheStrategy: 'both'
          })
          .then(async chunk => {
            // Process through worker
            const processed = await computationWorker.processVocabulary(chunk.words);
            
            // Update items array
            const startIdx = chunkIndex * chunkSize;
            processed.forEach((word, idx) => {
              itemsRef.current[startIdx + idx] = word;
            });
            
            // Update total count
            totalItemsRef.current = chunk.totalWords;
            
            // Clear loading state
            for (let i = chunkStart; i < chunkEnd; i++) {
              loadingIndexesRef.current.delete(i);
            }
            
            // Force re-render
            if (listRef.current) {
              listRef.current.forceUpdate();
            }
          })
          .catch(error => {
            console.error(`Failed to load chunk ${chunkIndex}:`, error);
            // Clear loading state on error
            for (let i = chunkStart; i < chunkEnd; i++) {
              loadingIndexesRef.current.delete(i);
            }
          });
        
        promises.push(promise);
      }
    }
    
    await Promise.all(promises);
  }, [lessonId]);
  
  // Check if item is loaded
  const isItemLoaded = useCallback((index: number) => {
    return !!itemsRef.current[index];
  }, []);
  
  // Get item count
  const getItemCount = () => {
    if (preloadedItems) {
      return preloadedItems.length;
    }
    return totalItemsRef.current || 100; // Start with estimate
  };
  
  // Handle item click with proper data
  const handleItemClick = useCallback((index: number) => {
    const item = itemsRef.current[index];
    if (item && onItemClick) {
      onItemClick(item);
    }
  }, [onItemClick]);
  
  // Render function wrapper
  const wrappedRenderItem = useCallback((item: any, index: number) => {
    return (
      <div 
        onClick={() => handleItemClick(index)}
        className="cursor-pointer hover:bg-gray-50 transition-colors"
      >
        {renderItem(item, index)}
      </div>
    );
  }, [renderItem, handleItemClick]);
  
  // Non-virtualized rendering for small lists
  if (!shouldVirtualize && preloadedItems) {
    return (
      <div className={className}>
        {preloadedItems.map((item, index) => (
          <div key={item.id || index}>
            {wrappedRenderItem(item, index)}
          </div>
        ))}
      </div>
    );
  }
  
  // Virtualized rendering for large lists
  return (
    <div ref={containerRef} className={className} style={{ height: '600px' }}>
      <InfiniteLoader
        ref={infiniteLoaderRef}
        isItemLoaded={isItemLoaded}
        itemCount={getItemCount()}
        loadMoreItems={loadMoreItems}
        minimumBatchSize={10}
        threshold={5}
      >
        {({ onItemsRendered, ref }) => (
          <List
            ref={(list) => {
              ref(list);
              listRef.current = list;
            }}
            height={600}
            itemCount={getItemCount()}
            itemSize={itemHeight}
            width="100%"
            onItemsRendered={onItemsRendered}
            itemData={{
              items: itemsRef.current,
              renderItem: wrappedRenderItem,
              isItemLoaded,
              loadingIndexes: loadingIndexesRef.current
            }}
            overscanCount={5}
          >
            {VocabularyRow}
          </List>
        )}
      </InfiniteLoader>
    </div>
  );
}

// Export a hook for programmatic control
export function useVirtualVocabularyList(lessonId: string) {
  const scrollToItem = useCallback((index: number) => {
    // Implementation for scrolling to specific item
  }, []);
  
  const refreshList = useCallback(async () => {
    await lazyVocabularyLoader.clearLessonCache(lessonId);
  }, [lessonId]);
  
  return {
    scrollToItem,
    refreshList
  };
}