'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/40">
      <div className="text-center p-8 max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-4">
          You're Offline
        </h1>
        <p className="text-muted-foreground mb-6">
          Please check your internet connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
        <div className="mt-8">
          <p className="text-sm text-muted-foreground">
            Some features may be available offline if you've used them before.
          </p>
        </div>
      </div>
    </div>
  );
}