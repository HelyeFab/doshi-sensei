'use client';

import { useState } from 'react';
import { Loader2, RefreshCw, WifiOff, Download } from 'lucide-react';
import { LoadingHourglass, LoadingHourglassButton, LoadingHourglassPage, LoadingHourglassCard, LoadingHourglassInline } from '@/components/ui/LoadingHourglass';
import { ConjugationLoadingAnimation } from '@/components/ui/ConjugationLoadingAnimation';

export default function LoadingAnimationsTestPage() {
  const [activeAnimation, setActiveAnimation] = useState<string | null>(null);

  const animations = {
    // LoadingHourglass Component Variants
    'hourglass-default': {
      name: 'LoadingHourglass - Default',
      component: <LoadingHourglass />,
      description: 'Default hourglass with spin animation'
    },
    'hourglass-with-text': {
      name: 'LoadingHourglass - With Text',
      component: <LoadingHourglass text="Loading content..." />,
      description: 'Hourglass with loading text'
    },
    'hourglass-sizes': {
      name: 'LoadingHourglass - All Sizes',
      component: (
        <div className="flex items-center gap-4">
          <LoadingHourglass size="xs" />
          <LoadingHourglass size="sm" />
          <LoadingHourglass size="md" />
          <LoadingHourglass size="lg" />
          <LoadingHourglass size="xl" />
          <LoadingHourglass size="2xl" />
          <LoadingHourglass size="3xl" />
        </div>
      ),
      description: 'All available sizes from xs to 3xl'
    },
    'hourglass-inline': {
      name: 'LoadingHourglass - Inline',
      component: (
        <span>
          Processing <LoadingHourglassInline /> please wait...
        </span>
      ),
      description: 'Inline hourglass within text'
    },
    'hourglass-button': {
      name: 'LoadingHourglass - Button',
      component: (
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded">
          <LoadingHourglassButton loading={true}>Submit</LoadingHourglassButton>
        </button>
      ),
      description: 'Button with loading state'
    },
    'hourglass-page': {
      name: 'LoadingHourglass - Page',
      component: <LoadingHourglassPage text="Loading page..." />,
      description: 'Full page loading state'
    },
    'hourglass-card': {
      name: 'LoadingHourglass - Card',
      component: <LoadingHourglassCard text="Loading card content..." />,
      description: 'Card loading state'
    },
    'hourglass-fullscreen': {
      name: 'LoadingHourglass - Fullscreen',
      component: null, // Special handling below
      description: 'Fullscreen overlay (click to show)',
      onClick: () => {
        const div = document.createElement('div');
        div.innerHTML = '<div id="fullscreen-loader"></div>';
        document.body.appendChild(div);
        
        const root = document.getElementById('fullscreen-loader');
        if (root) {
          const ReactDOM = require('react-dom/client');
          const reactRoot = ReactDOM.createRoot(root);
          reactRoot.render(<LoadingHourglass fullScreen text="Please wait..." />);
          
          setTimeout(() => {
            reactRoot.unmount();
            div.remove();
          }, 3000);
        }
      }
    },
    
    // Conjugation Loading Animation
    'conjugation-default': {
      name: 'ConjugationLoadingAnimation - Default',
      component: <ConjugationLoadingAnimation />,
      description: 'Educational loading with rotating phrases'
    },
    'conjugation-searching': {
      name: 'ConjugationLoadingAnimation - Searching',
      component: <ConjugationLoadingAnimation isSearching={true} />,
      description: 'With bouncing dots and progress bar'
    },
    
    // Standard CSS Spinners
    'css-spinner-small': {
      name: 'CSS Spinner - Small',
      component: (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
      ),
      description: 'Small circular spinner (16px)'
    },
    'css-spinner-medium': {
      name: 'CSS Spinner - Medium',
      component: (
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      ),
      description: 'Medium circular spinner (32px)'
    },
    'css-spinner-large': {
      name: 'CSS Spinner - Large',
      component: (
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      ),
      description: 'Large circular spinner (48px)'
    },
    'css-spinner-colored': {
      name: 'CSS Spinner - Colored Variants',
      component: (
        <div className="flex gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
        </div>
      ),
      description: 'Different color variants'
    },
    'css-spinner-full-border': {
      name: 'CSS Spinner - Full Border',
      component: (
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
      ),
      description: 'Full border with transparent top'
    },
    'css-spinner-thick': {
      name: 'CSS Spinner - Thick Border',
      component: (
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full"></div>
      ),
      description: 'Thicker border variant'
    },
    
    // Lucide Icon Spinners
    'lucide-loader2-small': {
      name: 'Lucide Loader2 - Small',
      component: <Loader2 className="w-4 h-4 animate-spin text-primary" />,
      description: 'Small Loader2 icon'
    },
    'lucide-loader2-medium': {
      name: 'Lucide Loader2 - Medium',
      component: <Loader2 className="w-6 h-6 animate-spin text-primary" />,
      description: 'Medium Loader2 icon'
    },
    'lucide-loader2-large': {
      name: 'Lucide Loader2 - Large',
      component: <Loader2 className="w-8 h-8 animate-spin text-primary" />,
      description: 'Large Loader2 icon'
    },
    'lucide-refresh': {
      name: 'Lucide RefreshCw - Spinning',
      component: <RefreshCw className="w-10 h-10 text-white animate-spin" />,
      description: 'RefreshCw icon (used in offline page)',
      bgClass: 'bg-green-500'
    },
    
    // Emoji Spinners
    'emoji-hourglass': {
      name: 'Emoji - Hourglass',
      component: <div className="animate-spin text-4xl">⏳</div>,
      description: 'Spinning hourglass emoji'
    },
    'emoji-refresh': {
      name: 'Emoji - Refresh',
      component: <span className="animate-spin inline-block text-2xl">🔄</span>,
      description: 'Spinning refresh emoji'
    },
    'emoji-sparkle-slow': {
      name: 'Emoji - Sparkle (Slow)',
      component: <div className="animate-spin-slow text-2xl">✨</div>,
      description: 'Slowly spinning sparkle',
      note: 'Requires animate-spin-slow class in Tailwind config'
    },
    
    // Custom Animations
    'bouncing-dots': {
      name: 'Bouncing Dots',
      component: (
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      ),
      description: 'Three bouncing dots with delay'
    },
    'pulse-spinner': {
      name: 'Pulse + Spin Combo',
      component: (
        <div className="relative">
          <div className="text-6xl animate-pulse">📚</div>
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
            <div className="animate-spin w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full"></div>
          </div>
        </div>
      ),
      description: 'Pulsing emoji with spinner below'
    },
    'shimmer-progress': {
      name: 'Shimmer Progress Bar',
      component: (
        <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-primary rounded-full animate-shimmer" />
        </div>
      ),
      description: 'Progress bar with shimmer effect'
    },
    
    // Complex Loading States
    'loading-with-message': {
      name: 'Loading with Message',
      component: (
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading article...</p>
        </div>
      ),
      description: 'Spinner with text below (common pattern)'
    },
    'button-with-spinner': {
      name: 'Button with Inline Spinner',
      component: (
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Loading...
        </button>
      ),
      description: 'Button with inline spinner'
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Loading Animations Test Page</h1>
          <p className="text-gray-600">
            All loading animations and spinners used in the Doshi Sensei app
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(animations).map(([key, animation]) => (
            <div key={key} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{animation.name}</h3>
                <p className="text-xs text-gray-500 mb-3">{animation.description}</p>
                {animation.note && (
                  <p className="text-xs text-amber-600 mb-3">⚠️ {animation.note}</p>
                )}
              </div>
              
              <div className={`border-t border-gray-100 p-8 flex items-center justify-center min-h-[120px] ${animation.bgClass || 'bg-gray-50'}`}>
                {animation.onClick ? (
                  <button
                    onClick={animation.onClick}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity"
                  >
                    Click to Show
                  </button>
                ) : (
                  activeAnimation === key || !animation.component ? (
                    animation.component || <div className="text-gray-400">Click button to activate</div>
                  ) : (
                    <button
                      onClick={() => setActiveAnimation(key)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                    >
                      Show Animation
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Animation Info</h3>
          <p className="text-sm text-blue-700">
            ✅ All animations are fully configured in the app's CSS. The shimmer and animate-spin-slow classes are defined in globals.css.
          </p>
          <p className="text-sm text-blue-600 mt-2">
            Navigate to <code className="px-1 py-0.5 bg-blue-100 rounded">/demo/loading-animations</code> to view this test page.
          </p>
        </div>
      </div>
    </div>
  );
}