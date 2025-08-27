'use client';

import { useState, useEffect } from 'react';
import { DEBUG_CONFIG, isSystemEnabled } from '@/config/debug';

export default function FirebaseDebugPage() {
  const [learningEnabled, setLearningEnabled] = useState(!DEBUG_CONFIG.DISABLE_LEARNING_EVENTS);
  const [statsEnabled, setStatsEnabled] = useState(!DEBUG_CONFIG.DISABLE_STATS_TRACKER);
  const [queueEnabled, setQueueEnabled] = useState(!DEBUG_CONFIG.DISABLE_EVENT_QUEUE);
  
  const toggleSystem = (system: 'learning' | 'stats' | 'queue') => {
    switch(system) {
      case 'learning':
        DEBUG_CONFIG.DISABLE_LEARNING_EVENTS = learningEnabled;
        setLearningEnabled(!learningEnabled);
        break;
      case 'stats':
        DEBUG_CONFIG.DISABLE_STATS_TRACKER = statsEnabled;
        setStatsEnabled(!statsEnabled);
        break;
      case 'queue':
        DEBUG_CONFIG.DISABLE_EVENT_QUEUE = queueEnabled;
        setQueueEnabled(!queueEnabled);
        break;
    }
    
    // Force page reload to apply changes
    setTimeout(() => window.location.reload(), 500);
  };
  
  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Firebase Debug Panel</h1>
        
        <div className="bg-card rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">System Status</h2>
          <p className="text-muted mb-4">
            Toggle systems on/off to isolate the Firebase 400 error. 
            The page will reload after toggling.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-background rounded-lg">
              <div>
                <h3 className="font-semibold">Learning Events Service</h3>
                <p className="text-sm text-muted">Tracks all learning activities</p>
              </div>
              <button
                onClick={() => toggleSystem('learning')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  learningEnabled 
                    ? 'bg-green-500 text-white' 
                    : 'bg-red-500 text-white'
                }`}
              >
                {learningEnabled ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-background rounded-lg">
              <div>
                <h3 className="font-semibold">Stats Tracker</h3>
                <p className="text-sm text-muted">Tracks user statistics and achievements</p>
              </div>
              <button
                onClick={() => toggleSystem('stats')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  statsEnabled 
                    ? 'bg-green-500 text-white' 
                    : 'bg-red-500 text-white'
                }`}
              >
                {statsEnabled ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-background rounded-lg">
              <div>
                <h3 className="font-semibold">Event Queue Manager</h3>
                <p className="text-sm text-muted">Manages event queue and syncing</p>
              </div>
              <button
                onClick={() => toggleSystem('queue')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  queueEnabled 
                    ? 'bg-green-500 text-white' 
                    : 'bg-red-500 text-white'
                }`}
              >
                {queueEnabled ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Debug Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-muted">
            <li>First, disable Learning Events Service and test if the 400 error persists</li>
            <li>If error continues, re-enable Learning Events and disable Stats Tracker</li>
            <li>If error still continues, disable Event Queue Manager</li>
            <li>Once you identify which system causes the error, we can focus on fixing it</li>
          </ol>
          
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
            <p className="text-sm">
              <strong>Note:</strong> Check the browser console for error messages.
              The 400 error will show which Firebase path is failing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}