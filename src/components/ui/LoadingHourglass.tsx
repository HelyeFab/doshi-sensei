'use client';

import { cn } from '@/lib/utils';

interface LoadingHourglassProps {
  /** Size of the hourglass - defaults to 'md' */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  /** Optional loading text to display below the hourglass */
  text?: string;
  /** Whether to show the hourglass inline with text - defaults to false */
  inline?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether to animate with spin - defaults to true */
  animate?: boolean;
  /** Custom color class - defaults to current text color */
  color?: string;
  /** Whether to center the component - defaults to true when not inline */
  center?: boolean;
  /** Show as a full-screen overlay */
  fullScreen?: boolean;
  /** Overlay background opacity (0-100) - only used with fullScreen */
  overlayOpacity?: number;
}

const sizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-2xl',
  lg: 'text-3xl',
  xl: 'text-4xl',
  '2xl': 'text-5xl',
  '3xl': 'text-6xl',
  '4xl': 'text-7xl',
};

const textSizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
};

/**
 * Standardized loading hourglass component used throughout the app
 * 
 * @example
 * // Simple usage
 * <LoadingHourglass />
 * 
 * @example
 * // With text
 * <LoadingHourglass text="Loading content..." />
 * 
 * @example
 * // Inline in button
 * <button>
 *   {loading ? <LoadingHourglass inline size="sm" /> : 'Submit'}
 * </button>
 * 
 * @example
 * // Full screen overlay
 * <LoadingHourglass fullScreen text="Please wait..." />
 * 
 * @example
 * // Custom styling
 * <LoadingHourglass size="xl" color="text-primary" text="Fetching data..." />
 */
export function LoadingHourglass({
  size = 'md',
  text,
  inline = false,
  className = '',
  animate = true,
  color,
  center = undefined,
  fullScreen = false,
  overlayOpacity = 50,
}: LoadingHourglassProps) {
  // Determine if we should center (default true when not inline and not fullScreen)
  const shouldCenter = center !== undefined ? center : (!inline && !fullScreen);

  const hourglassElement = (
    <span
      className={cn(
        sizeClasses[size],
        animate && 'animate-spin',
        color,
        inline && 'inline-block',
        className
      )}
      role="status"
      aria-label={text || 'Loading'}
    >
      ⏳
    </span>
  );

  // Inline mode - just return the hourglass
  if (inline) {
    return hourglassElement;
  }

  // Full screen overlay mode
  if (fullScreen) {
    return (
      <div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center',
          `bg-black/${overlayOpacity}`
        )}
      >
        <div className="flex flex-col items-center gap-4 p-8 bg-background/95 backdrop-blur-sm rounded-xl shadow-2xl border border-border">
          {hourglassElement}
          {text && (
            <p className={cn(textSizeClasses[size], 'text-muted-foreground animate-pulse')}>
              {text}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Regular mode with optional text
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2',
        shouldCenter && 'justify-center',
        className
      )}
    >
      {hourglassElement}
      {text && (
        <p className={cn(
          textSizeClasses[size],
          'text-muted-foreground',
          animate && 'animate-pulse'
        )}>
          {text}
        </p>
      )}
    </div>
  );
}

/**
 * Preset variations for common use cases
 */

export function LoadingHourglassButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  if (!loading) return <>{children}</>;
  return (
    <>
      <LoadingHourglass inline size="sm" className="mr-2" />
      Processing...
    </>
  );
}

export function LoadingHourglassPage({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <LoadingHourglass size="xl" text={text} />
    </div>
  );
}

export function LoadingHourglassCard({ text = "Loading content..." }: { text?: string }) {
  return (
    <div className="p-8 flex items-center justify-center">
      <LoadingHourglass size="lg" text={text} />
    </div>
  );
}

export function LoadingHourglassInline() {
  return <LoadingHourglass inline size="sm" />;
}

// Export default as well for convenience
export default LoadingHourglass;