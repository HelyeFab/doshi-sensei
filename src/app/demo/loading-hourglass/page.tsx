'use client';

import { useState } from 'react';
import { 
  LoadingHourglass, 
  LoadingHourglassButton,
  LoadingHourglassPage,
  LoadingHourglassCard,
  LoadingHourglassInline 
} from '@/components/ui/LoadingHourglass';

export default function LoadingHourglassDemo() {
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);

  const handleButtonClick = () => {
    setButtonLoading(true);
    setTimeout(() => setButtonLoading(false), 2000);
  };

  const handleFullScreenDemo = () => {
    setShowFullScreen(true);
    setTimeout(() => setShowFullScreen(false), 3000);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">LoadingHourglass Component Demo</h1>
          <p className="text-muted-foreground">
            Standardized loading indicator component using the ⏳ emoji
          </p>
        </div>

        {/* Size Variations */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <h2 className="text-2xl font-semibold mb-4">Size Variations</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted rounded">
              <LoadingHourglass size="xs" />
              <p className="text-sm mt-2">xs</p>
            </div>
            <div className="text-center p-4 bg-muted rounded">
              <LoadingHourglass size="sm" />
              <p className="text-sm mt-2">sm</p>
            </div>
            <div className="text-center p-4 bg-muted rounded">
              <LoadingHourglass size="md" />
              <p className="text-sm mt-2">md (default)</p>
            </div>
            <div className="text-center p-4 bg-muted rounded">
              <LoadingHourglass size="lg" />
              <p className="text-sm mt-2">lg</p>
            </div>
            <div className="text-center p-4 bg-muted rounded">
              <LoadingHourglass size="xl" />
              <p className="text-sm mt-2">xl</p>
            </div>
            <div className="text-center p-4 bg-muted rounded">
              <LoadingHourglass size="2xl" />
              <p className="text-sm mt-2">2xl</p>
            </div>
            <div className="text-center p-4 bg-muted rounded">
              <LoadingHourglass size="3xl" />
              <p className="text-sm mt-2">3xl</p>
            </div>
            <div className="text-center p-4 bg-muted rounded">
              <LoadingHourglass size="4xl" />
              <p className="text-sm mt-2">4xl</p>
            </div>
          </div>
        </div>

        {/* With Text */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <h2 className="text-2xl font-semibold mb-4">With Loading Text</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded">
              <LoadingHourglass size="md" text="Loading..." />
            </div>
            <div className="p-4 bg-muted rounded">
              <LoadingHourglass size="lg" text="Fetching data..." />
            </div>
            <div className="p-4 bg-muted rounded">
              <LoadingHourglass size="xl" text="Please wait..." />
            </div>
          </div>
        </div>

        {/* Color Variations */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <h2 className="text-2xl font-semibold mb-4">Color Variations</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted rounded">
              <LoadingHourglass size="lg" color="text-primary" />
              <p className="text-sm mt-2">Primary</p>
            </div>
            <div className="text-center p-4 bg-muted rounded">
              <LoadingHourglass size="lg" color="text-green-500" />
              <p className="text-sm mt-2">Success</p>
            </div>
            <div className="text-center p-4 bg-muted rounded">
              <LoadingHourglass size="lg" color="text-amber-500" />
              <p className="text-sm mt-2">Warning</p>
            </div>
            <div className="text-center p-4 bg-muted rounded">
              <LoadingHourglass size="lg" color="text-red-500" />
              <p className="text-sm mt-2">Error</p>
            </div>
          </div>
        </div>

        {/* Animation Control */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <h2 className="text-2xl font-semibold mb-4">Animation Control</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted rounded">
              <LoadingHourglass size="lg" animate={true} text="Animated (default)" />
            </div>
            <div className="p-4 bg-muted rounded">
              <LoadingHourglass size="lg" animate={false} text="Static" />
            </div>
          </div>
        </div>

        {/* Inline Usage */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <h2 className="text-2xl font-semibold mb-4">Inline Usage</h2>
          <div className="space-y-4">
            <p className="text-lg">
              Status: <LoadingHourglass inline size="sm" /> Loading your profile...
            </p>
            <p className="text-lg">
              Saving changes <LoadingHourglass inline size="sm" />
            </p>
            <button
              onClick={handleButtonClick}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              <LoadingHourglassButton loading={buttonLoading}>
                Click Me
              </LoadingHourglassButton>
            </button>
          </div>
        </div>

        {/* Preset Components */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <h2 className="text-2xl font-semibold mb-4">Preset Components</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">LoadingHourglassPage</h3>
              <div className="bg-muted rounded" style={{ height: '200px' }}>
                <LoadingHourglassPage text="Loading page content..." />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">LoadingHourglassCard</h3>
              <div className="bg-muted rounded">
                <LoadingHourglassCard text="Fetching card data..." />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">LoadingHourglassInline</h3>
              <p className="text-lg">
                Processing <LoadingHourglassInline /> please wait...
              </p>
            </div>
          </div>
        </div>

        {/* Full Screen Demo */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <h2 className="text-2xl font-semibold mb-4">Full Screen Overlay</h2>
          <button
            onClick={handleFullScreenDemo}
            className="px-6 py-3 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Show Full Screen Loading (3 seconds)
          </button>
        </div>

        {/* Usage Examples */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <h2 className="text-2xl font-semibold mb-4">Usage Examples</h2>
          <pre className="bg-muted p-4 rounded overflow-x-auto">
            <code>{`// Simple usage
<LoadingHourglass />

// With text
<LoadingHourglass text="Loading content..." />

// Different sizes
<LoadingHourglass size="xl" text="Please wait..." />

// Inline in text
<p>Status: <LoadingHourglass inline size="sm" /> Loading...</p>

// In buttons
<button>
  {loading ? <LoadingHourglassButton loading={true}>Submit</LoadingHourglassButton> : 'Submit'}
</button>

// Full page loading
<LoadingHourglassPage text="Loading page..." />

// Full screen overlay
<LoadingHourglass fullScreen text="Processing..." />

// Custom styling
<LoadingHourglass 
  size="lg" 
  color="text-primary" 
  text="Custom colored loading..."
/>`}</code>
          </pre>
        </div>
      </div>

      {/* Full Screen Overlay (conditionally rendered) */}
      {showFullScreen && (
        <LoadingHourglass 
          fullScreen 
          text="Processing your request..." 
          size="xl"
          overlayOpacity={70}
        />
      )}
    </div>
  );
}