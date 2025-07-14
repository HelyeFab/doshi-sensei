'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Copy, Check } from 'lucide-react';

export function DevHelper() {
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Available in both development and production
    // if (process.env.NODE_ENV !== 'development') return;

    // Check for dev mode toggle
    const checkDevMode = () => {
      const devMode = localStorage.getItem('devHelperMode') === 'true';
      setIsVisible(devMode);
    };

    // Initial check
    checkDevMode();

    // Listen for storage changes
    window.addEventListener('storage', checkDevMode);

    // Keyboard shortcut: Ctrl+Shift+D to toggle
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        const current = localStorage.getItem('devHelperMode') === 'true';
        localStorage.setItem('devHelperMode', (!current).toString());
        checkDevMode();
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    // Component hover detection
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const componentName = target.closest('[data-component-name]')?.getAttribute('data-component-name');
      if (componentName) {
        setHoveredComponent(componentName);
      }
    };

    if (isVisible) {
      document.addEventListener('mouseover', handleMouseOver);
    }

    return () => {
      window.removeEventListener('storage', checkDevMode);
      window.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('mouseover', handleMouseOver);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  // Parse pathname for better display
  const pageName = pathname === '/' ? 'Homepage' : pathname.split('/').filter(Boolean).join(' > ');

  const handleCopy = () => {
    const info = [
      `Page: ${pageName}`,
      `Route: ${pathname}`,
      hoveredComponent ? `Component: ${hoveredComponent}` : ''
    ].filter(Boolean).join('\n');
    
    navigator.clipboard.writeText(info);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed bottom-20 left-4 z-50 bg-black/90 text-white p-3 rounded-lg text-sm max-w-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-yellow-400">🛠️ Dev Helper</div>
        <button
          onClick={handleCopy}
          className="p-1 hover:bg-white/10 rounded transition-colors"
          title="Copy info"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4 text-gray-400" />
          )}
        </button>
      </div>
      <div className="space-y-1">
        <div>
          <span className="text-gray-400">Page:</span> {pageName}
        </div>
        <div>
          <span className="text-gray-400">Route:</span> {pathname}
        </div>
        {hoveredComponent && (
          <div>
            <span className="text-gray-400">Component:</span> 
            <span className="text-green-400"> {hoveredComponent}</span>
          </div>
        )}
      </div>
      <div className="mt-2 text-xs text-gray-500">
        Press Ctrl+Shift+D to toggle
      </div>
    </div>
  );
}

// Hook to mark components
export function useComponentName(name: string) {
  return {
    'data-component-name': name
  };
}

// Function to toggle Dev Helper
export function toggleDevHelper() {
  const current = localStorage.getItem('devHelperMode') === 'true';
  localStorage.setItem('devHelperMode', (!current).toString());
  window.dispatchEvent(new Event('storage'));
}