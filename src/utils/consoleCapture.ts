export interface ConsoleLog {
  timestamp: Date;
  type: 'log' | 'error' | 'warn' | 'info' | 'debug';
  message: string;
  args: any[];
  stack?: string;
}

class ConsoleCapture {
  private logs: ConsoleLog[] = [];
  private maxLogs = 500; // Keep last 500 logs
  private listeners: Set<(logs: ConsoleLog[]) => void> = new Set();
  private originalConsole: {
    log: typeof console.log;
    error: typeof console.error;
    warn: typeof console.warn;
    info: typeof console.info;
    debug: typeof console.debug;
  };
  private isCapturing = false;

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
      this.originalConsole.error.apply(console, args);
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

  private captureLog(type: ConsoleLog['type'], args: any[]) {
    const log: ConsoleLog = {
      timestamp: new Date(),
      type,
      message: this.formatMessage(args),
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
      const error = new Error();
      log.stack = error.stack;
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

  getLogs(filter?: ConsoleLog['type'] | 'all'): ConsoleLog[] {
    if (!filter || filter === 'all') {
      return [...this.logs];
    }
    return this.logs.filter(log => log.type === filter);
  }

  clearLogs() {
    this.logs = [];
    this.notifyListeners();
  }

  subscribe(listener: (logs: ConsoleLog[]) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.logs));
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Create singleton instance
export const consoleCapture = new ConsoleCapture();

// Auto-start capture in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  consoleCapture.startCapture();

}