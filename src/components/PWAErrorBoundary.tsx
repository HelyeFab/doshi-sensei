'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class PWAErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('PWA Error:', error, errorInfo);
    }
    
    // You can also log the error to an error reporting service
    // logErrorToService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return this.props.fallback || (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg m-4">
          <h3 className="text-sm font-medium text-yellow-800">PWA functionality temporarily unavailable</h3>
          <p className="text-xs text-yellow-600 mt-1">
            Some features may not work offline. Please refresh the page when online.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping PWA components
export function withPWAErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  fallback?: ReactNode
) {
  return (props: T) => (
    <PWAErrorBoundary fallback={fallback}>
      <Component {...props} />
    </PWAErrorBoundary>
  );
}