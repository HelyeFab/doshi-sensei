'use client';

import { useEffect, useState } from 'react';

interface DebugEvent {
  timestamp: string;
  type: string;
  message: string;
  data?: any;
}

export function StatsDebugSummary() {
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') return;

    // Intercept console logs
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    const addEvent = (type: string, args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');

      // Filter for stats-related messages
      if (message.includes('📊') || message.includes('📱') || message.includes('📦') || 
          message.includes('☁️') || message.includes('💾') || message.includes('🔍') ||
          message.includes('🎮') || message.includes('👀') || message.includes('📈') ||
          message.includes('👤') || message.includes('🔄') || message.includes('getUserStats') ||
          message.includes('loadStats') || message.includes('stats') || message.includes('Stats')) {
        
        setEvents(prev => [...prev, {
          timestamp: new Date().toISOString(),
          type,
          message,
          data: args.length > 1 ? args.slice(1) : undefined
        }].slice(-50)); // Keep last 50 events
      }
    };

    console.log = (...args) => {
      originalLog(...args);
      addEvent('log', args);
    };

    console.error = (...args) => {
      originalError(...args);
      addEvent('error', args);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addEvent('warn', args);
    };

    // Cleanup
    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  if (process.env.NODE_ENV !== 'development') return null;

  // Analyze events for summary
  const getLoadSequence = () => {
    const sequence: string[] = [];
    let lastUserSet = '';
    let lastStatsLoaded = '';
    let cloudSyncAttempts = 0;
    let localLoads = 0;
    let raceConditions = 0;

    events.forEach(event => {
      if (event.message.includes('setUser()')) {
        lastUserSet = event.timestamp;
        sequence.push(`${event.timestamp}: User context set`);
      }
      if (event.message.includes('getUserStats() called')) {
        sequence.push(`${event.timestamp}: Stats requested`);
      }
      if (event.message.includes('Local stats loaded')) {
        localLoads++;
        sequence.push(`${event.timestamp}: Local stats loaded`);
      }
      if (event.message.includes('Background sync')) {
        cloudSyncAttempts++;
        sequence.push(`${event.timestamp}: Cloud sync attempt`);
      }
      if (event.message.includes('loadStats() called')) {
        const source = event.message.includes('MobileHome') ? 'MobileHome' : 'HomePage';
        sequence.push(`${event.timestamp}: ${source} loadStats()`);
      }
      if (event.message.includes('New stats:') && event.message.includes('Previous stats:')) {
        const timeDiff = lastStatsLoaded ? 
          new Date(event.timestamp).getTime() - new Date(lastStatsLoaded).getTime() : 0;
        if (timeDiff > 0 && timeDiff < 100) {
          raceConditions++;
        }
        lastStatsLoaded = event.timestamp;
      }
    });

    return { sequence, cloudSyncAttempts, localLoads, raceConditions };
  };

  const { sequence, cloudSyncAttempts, localLoads, raceConditions } = getLoadSequence();

  return (
    <>
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-50 bg-yellow-500 text-black px-3 py-1 rounded-md text-xs font-mono"
      >
        📊 Debug ({events.length})
      </button>

      {isVisible && (
        <div className="fixed inset-0 z-50 bg-black/80 overflow-hidden">
          <div className="h-full overflow-y-auto p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Stats Loading Debug Summary</h2>
                <button
                  onClick={() => setIsVisible(false)}
                  className="text-red-500 hover:text-red-700"
                >
                  Close
                </button>
              </div>

              {/* Summary */}
              <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded">
                <h3 className="font-bold mb-2">Summary</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Cloud Sync Attempts: {cloudSyncAttempts}</div>
                  <div>Local Loads: {localLoads}</div>
                  <div className={raceConditions > 0 ? 'text-red-500' : ''}>
                    Race Conditions: {raceConditions}
                  </div>
                  <div>Total Events: {events.length}</div>
                </div>
              </div>

              {/* Load Sequence */}
              <div className="mb-6">
                <h3 className="font-bold mb-2">Load Sequence</h3>
                <div className="space-y-1 text-xs font-mono max-h-40 overflow-y-auto bg-gray-100 dark:bg-gray-800 p-2 rounded">
                  {sequence.map((seq, i) => (
                    <div key={i} className="whitespace-nowrap">{seq}</div>
                  ))}
                </div>
              </div>

              {/* All Events */}
              <div>
                <h3 className="font-bold mb-2">All Events</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {events.map((event, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded text-xs font-mono ${
                        event.type === 'error' ? 'bg-red-100 dark:bg-red-900' :
                        event.type === 'warn' ? 'bg-yellow-100 dark:bg-yellow-900' :
                        'bg-gray-100 dark:bg-gray-800'
                      }`}
                    >
                      <div className="font-bold">{event.timestamp} [{event.type}]</div>
                      <div className="whitespace-pre-wrap break-all">{event.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}