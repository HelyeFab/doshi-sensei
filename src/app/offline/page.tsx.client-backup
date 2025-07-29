'use client';

import { PageHeader } from '@/components/PageHeader';

export default function OfflinePage() {
  return (
    <>
      {/* Top Gradient Section */}
      <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />
      </div>
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 min-h-screen">
        <PageHeader title="Offline" />
        <div className="max-w-md mx-auto text-center">
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-gray-400 dark:text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2v6m0 8v6m8-10h-6m-8 0H2"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              You're Offline
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              It looks like you're not connected to the internet. Some features may not be available.
            </p>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Available Offline:
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Practice conjugations</li>
                <li>• Review vocabulary</li>
                <li>• Access cached content</li>
                <li>• View your progress</li>
              </ul>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                Requires Internet:
              </h3>
              <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
                <li>• Dictionary lookups</li>
                <li>• New content updates</li>
                <li>• WaniKani integration</li>
                <li>• Data synchronization</li>
              </ul>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
            >
              Try Again
            </button>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Once you're back online, refresh this page or navigate to any section.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
