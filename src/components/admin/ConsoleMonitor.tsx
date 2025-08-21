'use client';

import { useState, useEffect, useRef } from 'react';
import { consoleCapture, ConsoleLog } from '@/utils/consoleCapture';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  Terminal,
  AlertCircle,
  AlertTriangle,
  Info,
  Bug
} from 'lucide-react';

export function ConsoleMonitor() {
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [filter, setFilter] = useState<ConsoleLog['type'] | 'all'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get initial logs
    setLogs(consoleCapture.getLogs());

    // Subscribe to updates
    const unsubscribe = consoleCapture.subscribe((newLogs) => {
      setLogs(newLogs);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const getTypeIcon = (type: ConsoleLog['type']) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      case 'warn':
        return <AlertTriangle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
      case 'debug':
        return <Bug className="h-4 w-4" />;
      default:
        return <Terminal className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: ConsoleLog['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-500';
      case 'warn':
        return 'text-yellow-500';
      case 'info':
        return 'text-blue-500';
      case 'debug':
        return 'text-gray-500';
      default:
        return 'text-foreground';
    }
  };

  const filteredLogs = filter === 'all' ? logs : logs.filter(log => log.type === filter);

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedLogs(newExpanded);
  };

  const handleExport = () => {
    const data = consoleCapture.exportLogs();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `console-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (confirm('Clear all console logs?')) {
      consoleCapture.clearLogs();
      setExpandedLogs(new Set());
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* Filter buttons */}
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({logs.length})
          </Button>
          <Button
            variant={filter === 'log' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('log')}
          >
            <Terminal className="h-4 w-4 mr-1" />
            Log ({logs.filter(l => l.type === 'log').length})
          </Button>
          <Button
            variant={filter === 'error' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('error')}
          >
            <AlertCircle className="h-4 w-4 mr-1" />
            Error ({logs.filter(l => l.type === 'error').length})
          </Button>
          <Button
            variant={filter === 'warn' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('warn')}
          >
            <AlertTriangle className="h-4 w-4 mr-1" />
            Warn ({logs.filter(l => l.type === 'warn').length})
          </Button>
          <Button
            variant={filter === 'info' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('info')}
          >
            <Info className="h-4 w-4 mr-1" />
            Info ({logs.filter(l => l.type === 'info').length})
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Auto-scroll</span>
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            title="Export logs as JSON"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            title="Clear all logs"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Logs display */}
      <div className="border rounded-lg bg-muted/50 p-4 max-h-[600px] overflow-y-auto font-mono text-sm">
        {filteredLogs.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No console logs captured yet
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log, index) => {
              const isExpanded = expandedLogs.has(index);
              const hasComplexData = log.args.some(arg => typeof arg === 'object');

              return (
                <div
                  key={index}
                  className={`border rounded p-2 ${
                    log.type === 'error' ? 'border-red-500/50 bg-red-500/10' :
                    log.type === 'warn' ? 'border-yellow-500/50 bg-yellow-500/10' :
                    'border-border bg-background'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {hasComplexData && (
                      <button
                        onClick={() => toggleExpanded(index)}
                        className="mt-0.5 p-0.5 hover:bg-muted rounded"
                      >
                        {isExpanded ? 
                          <ChevronDown className="h-3 w-3" /> : 
                          <ChevronRight className="h-3 w-3" />
                        }
                      </button>
                    )}
                    <div className={`${getTypeColor(log.type)} mt-0.5`}>
                      {getTypeIcon(log.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {log.type}
                        </Badge>
                      </div>
                      <pre className="whitespace-pre-wrap break-all text-xs">
                        {log.message}
                      </pre>
                      {isExpanded && hasComplexData && (
                        <div className="mt-2 pl-4 border-l-2 border-muted">
                          {log.args.map((arg, argIndex) => (
                            typeof arg === 'object' && (
                              <pre key={argIndex} className="text-xs whitespace-pre-wrap">
                                {JSON.stringify(arg, null, 2)}
                              </pre>
                            )
                          ))}
                        </div>
                      )}
                      {log.stack && isExpanded && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          <div className="font-semibold mb-1">Stack trace:</div>
                          <pre className="whitespace-pre-wrap">{log.stack}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredLogs.length} of {logs.length} logs
      </div>
    </div>
  );
}