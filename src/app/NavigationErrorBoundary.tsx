'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class NavigationErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('[NavigationErrorBoundary] Caught error:', error);
    console.error('[NavigationErrorBoundary] Error stack:', error.stack);
    
    // Check if this is a navigation-related error
    if (error.message.includes('useNavigation') || 
        error.message.includes('NavigationProvider') ||
        error.message.includes('Fast Refresh')) {
      console.error('🚨 Navigation Error Detected!');
    }
    
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[NavigationErrorBoundary] Error details:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="p-4">
          <h2>Something went wrong with navigation.</h2>
          <details className="mt-2">
            <summary>Error details</summary>
            <pre className="mt-2 text-sm">{this.state.error?.message}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}