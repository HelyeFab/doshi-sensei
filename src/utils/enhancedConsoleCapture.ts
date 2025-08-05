export interface EnhancedConsoleLog {
  timestamp: Date;
  type: 'log' | 'error' | 'warn' | 'info' | 'debug';
  category: 'seo' | 'auth' | 'stats' | 'api' | 'ui' | 'performance' | 'system' | 'other';
  message: string;
  args: any[];
  stack?: string;
  source?: string;
}

class EnhancedConsoleCapture {
  private logs: EnhancedConsoleLog[] = [];
  private maxLogs = 1000; // Keep last 1000 logs
  private listeners: Set<(logs: EnhancedConsoleLog[]) => void> = new Set();
  private originalConsole: {
    log: typeof console.log;
    error: typeof console.error;
    warn: typeof console.warn;
    info: typeof console.info;
    debug: typeof console.debug;
  };
  private isCapturing = false;
  private categoryPatterns: { pattern: RegExp; category: EnhancedConsoleLog['category'] }[] = [
    // SEO patterns
    { pattern: /seo|meta|schema|structured.?data|og:|twitter:|canonical/i, category: 'seo' },
    
    // Auth patterns
    { pattern: /auth|login|logout|user|uid|token|session|permission|entitlement/i, category: 'auth' },
    
    // Stats patterns
    { pattern: /stats|analytics|tracking|event|metric|usage|achievement/i, category: 'stats' },
    
    // API patterns
    { pattern: /api|fetch|request|response|endpoint|route|http/i, category: 'api' },
    
    // UI patterns
    { pattern: /render|component|react|mount|unmount|update|dom|css|style/i, category: 'ui' },
    
    // Performance patterns
    { pattern: /performance|slow|lag|memory|cache|indexeddb|optimize/i, category: 'performance' },
    
    // System patterns
    { pattern: /system|firebase|firestore|storage|database|network/i, category: 'system' },
  ];

  constructor() {
    // Store original console methods
    this.originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug,
    };
  }

  startCapture() {
    if (this.isCapturing) return;
    this.isCapturing = true;

    // Override console methods
    console.log = (...args: any[]) => {
      this.captureLog('log', args);
      this.originalConsole.log.apply(console, args);
    };

    console.error = (...args: any[]) => {
      this.captureLog('error', args);
      this.originalConsole.error.call(console, ...args);
    };

    console.warn = (...args: any[]) => {
      this.captureLog('warn', args);
      this.originalConsole.warn.apply(console, args);
    };

    console.info = (...args: any[]) => {
      this.captureLog('info', args);
      this.originalConsole.info.apply(console, args);
    };

    console.debug = (...args: any[]) => {
      this.captureLog('debug', args);
      this.originalConsole.debug.apply(console, args);
    };
  }

  stopCapture() {
    if (!this.isCapturing) return;
    this.isCapturing = false;

    // Restore original console methods
    console.log = this.originalConsole.log;
    console.error = this.originalConsole.error;
    console.warn = this.originalConsole.warn;
    console.info = this.originalConsole.info;
    console.debug = this.originalConsole.debug;
  }

  private detectCategory(message: string, args: any[]): EnhancedConsoleLog['category'] {
    // Check message and all string arguments for patterns
    const combinedText = [message, ...args.filter(arg => typeof arg === 'string')].join(' ');
    
    for (const { pattern, category } of this.categoryPatterns) {
      if (pattern.test(combinedText)) {
        return category;
      }
    }
    
    return 'other';
  }

  private captureLog(type: EnhancedConsoleLog['type'], args: any[]) {
    const message = this.formatMessage(args);
    const category = this.detectCategory(message, args);
    
    // Try to get source from stack trace
    const error = new Error();
    const stack = error.stack || '';
    const stackLines = stack.split('\n');
    let source = '';
    
    // Find the first stack line that's not from this file
    for (const line of stackLines) {
      if (!line.includes('enhancedConsoleCapture') && !line.includes('consoleCapture')) {
        const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
        if (match) {
          source = match[2].split('/').pop() || '';
          break;
        }
      }
    }
    
    const log: EnhancedConsoleLog = {
      timestamp: new Date(),
      type,
      category,
      message,
      source,
      args: args.map(arg => {
        try {
          // Try to serialize the argument
          if (typeof arg === 'object' && arg !== null) {
            return JSON.parse(JSON.stringify(arg));
          }
          return arg;
        } catch {
          return String(arg);
        }
      }),
    };

    // Capture stack trace for errors
    if (type === 'error') {
      log.stack = stack;
    }

    this.logs.push(log);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Notify listeners
    this.notifyListeners();
  }

  private formatMessage(args: any[]): string {
    return args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
  }

  getLogs(filter?: {
    type?: EnhancedConsoleLog['type'] | 'all';
    category?: EnhancedConsoleLog['category'] | 'all';
  }): EnhancedConsoleLog[] {
    let filteredLogs = [...this.logs];
    
    if (filter?.type && filter.type !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.type === filter.type);
    }
    
    if (filter?.category && filter.category !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.category === filter.category);
    }
    
    return filteredLogs;
  }

  clearLogs(category?: EnhancedConsoleLog['category']) {
    if (category) {
      this.logs = this.logs.filter(log => log.category !== category);
    } else {
      this.logs = [];
    }
    this.notifyListeners();
  }

  subscribe(listener: (logs: EnhancedConsoleLog[]) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.logs));
  }

  exportLogs(category?: EnhancedConsoleLog['category']): string {
    const logsToExport = category ? this.getLogs({ category }) : this.logs;
    return JSON.stringify(logsToExport, null, 2);
  }

  getStats() {
    const stats = {
      total: this.logs.length,
      byType: {} as Record<EnhancedConsoleLog['type'], number>,
      byCategory: {} as Record<EnhancedConsoleLog['category'], number>,
    };

    // Count by type
    const types: EnhancedConsoleLog['type'][] = ['log', 'error', 'warn', 'info', 'debug'];
    types.forEach(type => {
      stats.byType[type] = this.logs.filter(log => log.type === type).length;
    });

    // Count by category
    const categories: EnhancedConsoleLog['category'][] = ['seo', 'auth', 'stats', 'api', 'ui', 'performance', 'system', 'other'];
    categories.forEach(category => {
      stats.byCategory[category] = this.logs.filter(log => log.category === category).length;
    });

    return stats;
  }
}

// Create singleton instance
export const enhancedConsoleCapture = new EnhancedConsoleCapture();

// Auto-start capture in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  enhancedConsoleCapture.startCapture();
  // console.log('🎯 Enhanced console capture started - logs are categorized by section');
}