'use client';

import React, { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  isRetrying: boolean;
}

export class DatabaseErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isRetrying: false
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if it's a database-related error
    const isDatabaseError = 
      error.message.includes('IndexedDB') ||
      error.message.includes('database') ||
      error.message.includes('transaction') ||
      error.message.includes('closing') ||
      error.message.includes('closed');
    
    return {
      hasError: isDatabaseError,
      error: isDatabaseError ? error : null,
      errorInfo: null,
      isRetrying: false
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Database Error Boundary caught error:', error, errorInfo);
    
    // Only handle database errors
    if (
      error.message.includes('IndexedDB') ||
      error.message.includes('database') ||
      error.message.includes('transaction') ||
      error.message.includes('closing') ||
      error.message.includes('closed')
    ) {
      this.setState({
        errorInfo
      });
      
      if (this.props.onError) {
        this.props.onError(error, errorInfo);
      }
    }
  }

  handleRetry = async () => {
    this.setState({ isRetrying: true });
    
    // Clear IndexedDB and retry
    if (typeof window !== 'undefined') {
      try {
        // Close all existing connections
        const { IndexedDBConnectionManager } = await import('@/utils/indexedDBConnectionManager');
        await IndexedDBConnectionManager.closeAll();
        
        // Wait a moment for cleanup
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Reset state and retry
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
          isRetrying: false
        });
        
        // Force re-render
        window.location.reload();
      } catch (error) {
        console.error('Failed to retry:', error);
        this.setState({ isRetrying: false });
      }
    }
  };

  handleClearStorage = async () => {
    if (typeof window !== 'undefined' && confirm('This will clear all local data. Are you sure?')) {
      try {
        // Get all database names
        const databases = await indexedDB.databases();
        
        // Delete each database
        for (const db of databases) {
          if (db.name) {
            await indexedDB.deleteDatabase(db.name);
          }
        }
        
        // Clear other storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Reload the page
        window.location.reload();
      } catch (error) {
        console.error('Failed to clear storage:', error);
        alert('Failed to clear storage. Please try manually clearing your browser data.');
      }
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-500 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">
                Database Error
              </h2>
            </div>
            
            <p className="text-gray-600 mb-4">
              We encountered an issue with the local database. This often happens during development or after updates.
            </p>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Error Details
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            
            <div className="flex flex-col gap-2">
              <button
                onClick={this.handleRetry}
                disabled={this.state.isRetrying}
                className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {this.state.isRetrying ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </>
                )}
              </button>
              
              <button
                onClick={this.handleClearStorage}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Clear Local Storage
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap components with database error boundary
 */
export function withDatabaseErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithDatabaseErrorBoundaryComponent(props: P) {
    return (
      <DatabaseErrorBoundary fallback={fallback}>
        <Component {...props} />
      </DatabaseErrorBoundary>
    );
  };
}