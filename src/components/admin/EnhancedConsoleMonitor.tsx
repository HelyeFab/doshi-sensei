'use client';

import { useState, useEffect, useRef } from 'react';
import { enhancedConsoleCapture, EnhancedConsoleLog } from '@/utils/enhancedConsoleCapture';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  Terminal,
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
  Search,
  Shield,
  BarChart3,
  Globe,
  Layout,
  Zap,
  Server,
  MoreHorizontal,
  RefreshCw,
  Filter
} from 'lucide-react';

const categoryIcons: Record<EnhancedConsoleLog['category'], React.ElementType> = {
  seo: Search,
  auth: Shield,
  stats: BarChart3,
  api: Globe,
  ui: Layout,
  performance: Zap,
  system: Server,
  other: MoreHorizontal
};

const categoryColors: Record<EnhancedConsoleLog['category'], { text: string; bg: string }> = {
  seo: { text: 'text-green-600', bg: 'bg-green-50' },
  auth: { text: 'text-purple-600', bg: 'bg-purple-50' },
  stats: { text: 'text-blue-600', bg: 'bg-blue-50' },
  api: { text: 'text-orange-600', bg: 'bg-orange-50' },
  ui: { text: 'text-pink-600', bg: 'bg-pink-50' },
  performance: { text: 'text-yellow-600', bg: 'bg-yellow-50' },
  system: { text: 'text-gray-600', bg: 'bg-gray-100' },
  other: { text: 'text-gray-500', bg: 'bg-gray-50' }
};

export function EnhancedConsoleMonitor() {
  const [logs, setLogs] = useState<EnhancedConsoleLog[]>([]);
  const [filter, setFilter] = useState<EnhancedConsoleLog['type'] | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<EnhancedConsoleLog['category'] | 'all'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get initial logs
    setLogs(enhancedConsoleCapture.getLogs());

    // Subscribe to updates
    const unsubscribe = enhancedConsoleCapture.subscribe((newLogs) => {
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

  const getTypeIcon = (type: EnhancedConsoleLog['type']) => {
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

  const getTypeColor = (type: EnhancedConsoleLog['type']) => {
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

  const filteredLogs = logs.filter(log => {
    // Type filter
    if (filter !== 'all' && log.type !== filter) return false;
    
    // Category filter
    if (categoryFilter !== 'all' && log.category !== categoryFilter) return false;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return log.message.toLowerCase().includes(query) ||
             log.args.some(arg => String(arg).toLowerCase().includes(query));
    }
    
    return true;
  });

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedLogs(newExpanded);
  };

  const handleExport = (category?: EnhancedConsoleLog['category']) => {
    const data = enhancedConsoleCapture.exportLogs(category);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `console-logs-${category || 'all'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = (category?: EnhancedConsoleLog['category']) => {
    const message = category 
      ? `Clear all ${category} logs?` 
      : 'Clear all console logs?';
    
    if (confirm(message)) {
      enhancedConsoleCapture.clearLogs(category);
      setExpandedLogs(new Set());
    }
  };

  const stats = enhancedConsoleCapture.getStats();

  const LogDisplay = ({ logs: displayLogs }: { logs: EnhancedConsoleLog[] }) => (
    <div className="space-y-2">
      {displayLogs.map((log, index) => {
        const isExpanded = expandedLogs.has(index);
        const hasComplexData = log.args.some(arg => typeof arg === 'object');
        const CategoryIcon = categoryIcons[log.category];

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
              <div className={`${categoryColors[log.category].text} mt-0.5`}>
                <CategoryIcon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {log.type}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {log.category}
                  </Badge>
                  {log.source && (
                    <span className="text-xs text-muted-foreground">
                      {log.source}
                    </span>
                  )}
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
  );

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {Object.entries(stats.byCategory).map(([category, count]) => {
          const Icon = categoryIcons[category as EnhancedConsoleLog['category']];
          const colors = categoryColors[category as EnhancedConsoleLog['category']];
          
          return (
            <Card 
              key={category} 
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 border-gray-200"
              onClick={() => setCategoryFilter(category as EnhancedConsoleLog['category'])}
            >
              <CardContent className="p-3 text-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`p-2 rounded-lg ${colors.bg} ${colors.text}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900 leading-tight">{count}</p>
                    <p className="text-xs text-muted-foreground capitalize leading-tight">{category}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* Type filter buttons */}
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
            Log ({stats.byType.log})
          </Button>
          <Button
            variant={filter === 'error' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('error')}
          >
            <AlertCircle className="h-4 w-4 mr-1" />
            Error ({stats.byType.error})
          </Button>
          <Button
            variant={filter === 'warn' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('warn')}
          >
            <AlertTriangle className="h-4 w-4 mr-1" />
            Warn ({stats.byType.warn})
          </Button>
          <Button
            variant={filter === 'info' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('info')}
          >
            <Info className="h-4 w-4 mr-1" />
            Info ({stats.byType.info})
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1 text-sm border rounded-md"
          />
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
            onClick={() => handleExport()}
            title="Export all logs as JSON"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleClear()}
            title="Clear all logs"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as any)}>
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="auth">Auth</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="ui">UI</TabsTrigger>
          <TabsTrigger value="performance">Perf</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="other">Other</TabsTrigger>
        </TabsList>

        <TabsContent value={categoryFilter} className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="capitalize">
                    {categoryFilter === 'all' ? 'All Logs' : `${categoryFilter} Logs`}
                  </CardTitle>
                  <CardDescription>
                    {filteredLogs.length} logs {searchQuery && `matching "${searchQuery}"`}
                  </CardDescription>
                </div>
                {categoryFilter !== 'all' && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport(categoryFilter)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Export
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleClear(categoryFilter)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg bg-muted/50 p-4 max-h-[600px] overflow-y-auto font-mono text-sm">
                {filteredLogs.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No logs found
                  </div>
                ) : (
                  <LogDisplay logs={filteredLogs} />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}