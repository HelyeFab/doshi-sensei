'use client';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

export function Spinner({ size = 'md', className = '', label }: SpinnerProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-2xl';
      case 'md':
        return 'text-4xl';
      case 'lg':
        return 'text-6xl';
      case 'xl':
        return 'text-8xl';
      default:
        return 'text-4xl';
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={`${getSizeClasses()} animate-spin`}
        style={{
          animation: 'spin 2s linear infinite',
        }}
        role="status"
        aria-label={label || 'Loading'}
      >
        ⏳
      </div>
      {label && (
        <p className="mt-2 text-sm text-muted-foreground">{label}</p>
      )}
      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

// Inline spinner for buttons and small spaces
export function InlineSpinner({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'text-base' : 'text-xl';
  
  return (
    <span
      className={`inline-block ${sizeClass} animate-spin`}
      style={{
        animation: 'spin 2s linear infinite',
      }}
      role="status"
      aria-label="Loading"
    >
      ⏳
      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </span>
  );
}

// Full page spinner overlay
export function PageSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Spinner size="lg" label={message} />
    </div>
  );
}