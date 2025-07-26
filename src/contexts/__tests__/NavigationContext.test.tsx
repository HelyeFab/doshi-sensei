import React from 'react';
import { render, renderHook, act, waitFor } from '@testing-library/react';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn()
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-id-' + Date.now())
}));

// Mock state preservation service
jest.mock('@/services/navigation/statePreservation', () => ({
  statePreservation: {
    save: jest.fn(),
    restore: jest.fn(),
    clear: jest.fn(),
    clearOld: jest.fn()
  }
}));

// Mock navigation rules
jest.mock('@/lib/navigation/rules', () => ({
  navigationRules: {
    shouldPreserveState: jest.fn((path) => path.includes('/games')),
    getStateSerializer: jest.fn((path) => {
      if (path.includes('/games')) {
        return (state: any) => ({
          score: state?.score,
          level: state?.level,
          currentQuestion: state?.currentQuestion,
          lives: state?.lives,
          progress: state?.progress
        });
      }
      return null;
    }),
    getReturnBehavior: jest.fn(() => 'standard'),
    getCustomReturnHandler: jest.fn(() => null),
    getMaxStackDepth: jest.fn(() => undefined),
    isNavigationAllowed: jest.fn(() => true)
  }
}));

// Import components after mocks
import { NavigationProvider, useNavigation } from '../NavigationContext';
import { usePathname, useRouter } from 'next/navigation';
import { statePreservation } from '@/services/navigation/statePreservation';
import { navigationRules } from '@/lib/navigation/rules';

describe('NavigationContext', () => {
  const mockRouter = { push: jest.fn() };
  
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue('/test-initial');
    
    // Clear session storage
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
    }
  });
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <NavigationProvider debug={false} enablePersistence={false}>
      {children}
    </NavigationProvider>
  );
  
  describe('Initial State', () => {
    it('should have empty stack initially', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper });
      
      expect(result.current.stack).toHaveLength(0);
      expect(result.current.currentEntry).toBeNull();
      expect(result.current.canGoBack).toBe(false);
      expect(result.current.canGoForward).toBe(false);
    });
  });
  
  describe('Navigation Actions', () => {
    it('should push new entries to stack', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper });
      
      act(() => {
        result.current.push({
          path: '/test',
          title: 'Test Page',
          type: 'page'
        });
      });
      
      expect(result.current.stack).toHaveLength(1);
      expect(result.current.currentEntry?.path).toBe('/test');
      expect(result.current.currentEntry?.title).toBe('Test Page');
      expect(result.current.canGoBack).toBe(false); // First entry
    });
    
    it('should handle multiple pushes', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper });
      
      act(() => {
        result.current.push({ path: '/', title: 'Home', type: 'page' });
        result.current.push({ path: '/games', title: 'Games', type: 'page' });
        result.current.push({ path: '/games/kana-drop', title: 'Kana Drop', type: 'game' });
      });
      
      expect(result.current.stack).toHaveLength(3);
      expect(result.current.currentEntry?.path).toBe('/games/kana-drop');
      expect(result.current.canGoBack).toBe(true);
    });
    
    it('should pop entries from stack', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper });
      
      act(() => {
        result.current.push({ path: '/', title: 'Home', type: 'page' });
        result.current.push({ path: '/games', title: 'Games', type: 'page' });
      });
      
      let popped;
      act(() => {
        popped = result.current.pop();
      });
      
      expect(result.current.currentEntry?.path).toBe('/');
      expect(result.current.stack).toHaveLength(2); // Stack preserved
    });
    
    it('should replace current entry', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper });
      
      act(() => {
        result.current.push({ path: '/test', title: 'Test', type: 'page' });
        result.current.replace({ path: '/test-replaced', title: 'Replaced', type: 'page' });
      });
      
      expect(result.current.stack).toHaveLength(1);
      expect(result.current.currentEntry?.path).toBe('/test-replaced');
    });
    
    it('should clear stack', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper });
      
      act(() => {
        result.current.push({ path: '/', title: 'Home', type: 'page' });
        result.current.push({ path: '/games', title: 'Games', type: 'page' });
        result.current.clear();
      });
      
      expect(result.current.stack).toHaveLength(0);
      expect(result.current.currentEntry).toBeNull();
    });
  });
  
  describe('Navigation Utilities', () => {
    it('should get back URL correctly', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper });
      
      act(() => {
        result.current.push({ path: '/', title: 'Home', type: 'page' });
        result.current.push({ path: '/games', title: 'Games', type: 'page' });
      });
      
      expect(result.current.getBackUrl()).toBe('/');
    });
    
    it('should get back title correctly', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper });
      
      act(() => {
        result.current.push({ path: '/', title: 'Home', type: 'page' });
        result.current.push({ path: '/games', title: 'Games', type: 'page' });
      });
      
      expect(result.current.getBackTitle()).toBe('Home');
    });
    
    it('should find entries in stack', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper });
      
      act(() => {
        result.current.push({ path: '/', title: 'Home', type: 'page' });
        result.current.push({ path: '/games', title: 'Games', type: 'page' });
        result.current.push({ path: '/vocabulary', title: 'Vocabulary', type: 'page' });
      });
      
      const found = result.current.findInStack(entry => entry.path === '/games');
      expect(found?.title).toBe('Games');
    });
  });
  
  describe('State Preservation', () => {
    it('should preserve state when requested', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper });
      const testState = { score: 100, level: 5 };
      
      act(() => {
        result.current.push({ path: '/games/test', title: 'Test Game', type: 'game' });
      });
      
      // Verify the game entry was added
      expect(result.current.currentEntry?.path).toBe('/games/test');
      
      // Now preserve state
      act(() => {
        result.current.preserveState(testState);
      });
      
      // Check if navigation rules were called
      expect(navigationRules.shouldPreserveState).toHaveBeenCalledWith('/games/test');
      expect(navigationRules.getStateSerializer).toHaveBeenCalledWith('/games/test');
      
      expect(statePreservation.save).toHaveBeenCalledWith(
        expect.stringContaining('test-id-'),
        {
          score: 100,
          level: 5,
          currentQuestion: undefined,
          lives: undefined,
          progress: undefined
        }
      );
    });
    
    it('should restore state', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper });
      const testState = { score: 100, level: 5 };
      
      (statePreservation.restore as jest.Mock).mockReturnValue(testState);
      
      act(() => {
        result.current.push({ path: '/games/test', title: 'Test Game', type: 'game' });
      });
      
      const restored = result.current.restoreState();
      expect(restored).toEqual(testState);
    });
  });
  
  describe('Stack Management', () => {
    it('should enforce max stack size', () => {
      const { result } = renderHook(() => useNavigation(), { 
        wrapper: ({ children }) => (
          <NavigationProvider maxStackSize={3} enablePersistence={false}>
            {children}
          </NavigationProvider>
        )
      });
      
      act(() => {
        result.current.push({ path: '/1', title: '1', type: 'page' });
        result.current.push({ path: '/2', title: '2', type: 'page' });
        result.current.push({ path: '/3', title: '3', type: 'page' });
        result.current.push({ path: '/4', title: '4', type: 'page' });
      });
      
      expect(result.current.stack).toHaveLength(3);
      expect(result.current.stack[0].path).toBe('/2'); // First was removed
    });
    
    it('should handle forward navigation correctly', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper });
      
      act(() => {
        result.current.push({ path: '/1', title: '1', type: 'page' });
        result.current.push({ path: '/2', title: '2', type: 'page' });
        result.current.push({ path: '/3', title: '3', type: 'page' });
        result.current.pop(); // Go back to /2
      });
      
      expect(result.current.canGoForward).toBe(true);
      
      act(() => {
        result.current.push({ path: '/4', title: '4', type: 'page' });
      });
      
      // Forward history should be cleared
      expect(result.current.stack).toHaveLength(3);
      expect(result.current.stack[2].path).toBe('/4');
    });
  });
});