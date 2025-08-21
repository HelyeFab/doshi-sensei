'use client';

import { useStrings } from '@/contexts/LanguageContext';

export default function YouTubeConnection() {
  const strings = useStrings();

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">YouTube Integration</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          <span>Not Connected</span>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Connect your YouTube account to access premium shadowing features and create personalized study playlists.
        </p>

        <div className="flex items-center gap-3">
          <button
            disabled
            className="px-4 py-2 bg-muted text-muted-foreground rounded-lg cursor-not-allowed"
          >
            Connect YouTube
          </button>
          <span className="text-sm text-muted-foreground">Coming Soon</span>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 mt-4">
          <h4 className="font-medium text-foreground mb-2">What you'll get:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Access to your YouTube playlists</li>
            <li>• Personalized video recommendations</li>
            <li>• Advanced shadowing features</li>
            <li>• Progress tracking across videos</li>
          </ul>
        </div>
      </div>
    </div>
  );
}