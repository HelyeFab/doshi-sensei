import { headers } from 'next/headers';

// Error boundary for server components
export async function withServerErrorBoundary<T extends {}>(
  Component: React.ComponentType<T>,
  fallback?: React.ReactNode
) {
  return async function WrappedComponent(props: T) {
    try {
      // Check if this is an RSC request
      const headersList = headers();
      const isRSC = headersList.get('rsc') === '1' || 
                    headersList.get('next-url')?.includes('_rsc');
      
      if (isRSC) {

      }
      
      return <Component {...props} />;
    } catch (error) {
      console.error(`[Server Component Error] Failed to render ${Component.name}:`, error);
      
      // Return a minimal fallback to prevent 502 errors
      if (fallback) {
        return <>{fallback}</>;
      }
      
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Loading Error
            </h1>
            <p className="text-gray-600">
              This page failed to load properly. Please refresh to try again.
            </p>
          </div>
        </div>
      );
    }
  };
}

// Safe metadata generation wrapper
export function safeGenerateMetadata(metadataFn: () => any) {
  try {
    return metadataFn();
  } catch (error) {
    console.error('[Metadata Generation Error]:', error);
    // Return minimal metadata to prevent crashes
    return {
      title: 'Dōshi Sensei',
      description: 'Japanese Learning Platform',
    };
  }
}