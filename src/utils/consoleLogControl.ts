// Runtime console log control system
export interface LogControlConfig {
  enabled: boolean;
  logLevel: 'all' | 'debug' | 'info' | 'warn' | 'error' | 'none';
  allowedCategories: string[];
  blockedCategories: string[];
  allowedFiles: string[];
  blockedFiles: string[];
  allowedMethods: string[];
  customFilters: Array<{
    pattern: RegExp;
    action: 'allow' | 'block';
  }>;
}

class ConsoleLogControl {
  private config: LogControlConfig = {
    enabled: true,
    logLevel: 'all',
    allowedCategories: [],
    blockedCategories: [],
    allowedFiles: [],
    blockedFiles: [],
    allowedMethods: ['log', 'error', 'warn', 'info', 'debug'],
    customFilters: []
  };

  private originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
  };

  private logLevelPriority = {
    none: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
    all: 5
  };

  constructor() {
    // Load config from localStorage if available
    if (typeof window !== 'undefined') {
      this.loadConfig();
      this.applyFilters();
    }
  }

  // Load configuration from localStorage
  private loadConfig() {
    try {
      const savedConfig = localStorage.getItem('console-log-control-config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }
    } catch (error) {
      console.error('Failed to load console log config:', error);
    }
  }

  // Save configuration to localStorage
  private saveConfig() {
    try {
      localStorage.setItem('console-log-control-config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save console log config:', error);
    }
  }

  // Apply filters to console methods
  private applyFilters() {
    const methods: ('log' | 'error' | 'warn' | 'info' | 'debug')[] = ['log', 'error', 'warn', 'info', 'debug'];

    methods.forEach(method => {
      (console as any)[method] = (...args: any[]) => {
        if (this.shouldLog(method, args)) {
          this.originalConsole[method].apply(console, args);
        }
      };
    });
  }

  // Determine if a log should be shown
  private shouldLog(method: string, args: any[]): boolean {
    // Check if logging is enabled
    if (!this.config.enabled) return false;

    // Check log level
    const methodPriority = this.logLevelPriority[method as keyof typeof this.logLevelPriority] || 5;
    const configPriority = this.logLevelPriority[this.config.logLevel];
    if (methodPriority > configPriority) return false;

    // Check allowed methods
    if (this.config.allowedMethods.length > 0 && !this.config.allowedMethods.includes(method)) {
      return false;
    }

    // Get log context
    const message = args.map(arg => String(arg)).join(' ');
    const stack = new Error().stack || '';
    const sourceFile = this.extractSourceFile(stack);
    const category = this.detectCategory(message);

    // Check file filters
    if (this.config.blockedFiles.length > 0) {
      if (this.config.blockedFiles.some(file => sourceFile.includes(file))) {
        return false;
      }
    }
    if (this.config.allowedFiles.length > 0) {
      if (!this.config.allowedFiles.some(file => sourceFile.includes(file))) {
        return false;
      }
    }

    // Check category filters
    if (this.config.blockedCategories.length > 0) {
      if (this.config.blockedCategories.includes(category)) {
        return false;
      }
    }
    if (this.config.allowedCategories.length > 0) {
      if (!this.config.allowedCategories.includes(category)) {
        return false;
      }
    }

    // Check custom filters
    for (const filter of this.config.customFilters) {
      if (filter.pattern.test(message)) {
        return filter.action === 'allow';
      }
    }

    return true;
  }

  // Extract source file from stack trace
  private extractSourceFile(stack: string): string {
    const lines = stack.split('\n');
    // Skip the first few lines which are this function and Error constructor
    for (let i = 3; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/at\s+.*?\s+\((.*?):\d+:\d+\)/);
      if (match) {
        return match[1];
      }
    }
    return '';
  }

  // Detect log category
  private detectCategory(message: string): string {
    const categories = {
      seo: /seo|meta|schema|structured.?data|og:|twitter:|canonical/i,
      auth: /auth|login|logout|user|uid|token|session|permission/i,
      stats: /stats|analytics|tracking|event|metric|usage/i,
      api: /api|fetch|request|response|endpoint|route|http/i,
      ui: /render|component|react|mount|unmount|update|dom/i,
      performance: /performance|slow|lag|memory|cache|optimize/i,
      system: /system|firebase|firestore|storage|database/i,
    };

    for (const [category, pattern] of Object.entries(categories)) {
      if (pattern.test(message)) {
        return category;
      }
    }

    return 'other';
  }

  // Public API methods

  // Enable/disable all logging
  setEnabled(enabled: boolean) {
    this.config.enabled = enabled;
    this.saveConfig();
  }

  // Set log level
  setLogLevel(level: LogControlConfig['logLevel']) {
    this.config.logLevel = level;
    this.saveConfig();
  }

  // Set allowed categories
  setAllowedCategories(categories: string[]) {
    this.config.allowedCategories = categories;
    this.config.blockedCategories = [];
    this.saveConfig();
  }

  // Set blocked categories
  setBlockedCategories(categories: string[]) {
    this.config.blockedCategories = categories;
    this.config.allowedCategories = [];
    this.saveConfig();
  }

  // Set allowed files
  setAllowedFiles(files: string[]) {
    this.config.allowedFiles = files;
    this.config.blockedFiles = [];
    this.saveConfig();
  }

  // Set blocked files
  setBlockedFiles(files: string[]) {
    this.config.blockedFiles = files;
    this.config.allowedFiles = [];
    this.saveConfig();
  }

  // Set allowed methods
  setAllowedMethods(methods: string[]) {
    this.config.allowedMethods = methods;
    this.saveConfig();
  }

  // Add custom filter
  addCustomFilter(pattern: string | RegExp, action: 'allow' | 'block') {
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
    this.config.customFilters.push({ pattern: regex, action });
    this.saveConfig();
  }

  // Remove custom filter
  removeCustomFilter(index: number) {
    this.config.customFilters.splice(index, 1);
    this.saveConfig();
  }

  // Get current configuration
  getConfig(): LogControlConfig {
    return { ...this.config };
  }

  // Reset to defaults
  reset() {
    this.config = {
      enabled: true,
      logLevel: 'all',
      allowedCategories: [],
      blockedCategories: [],
      allowedFiles: [],
      blockedFiles: [],
      allowedMethods: ['log', 'error', 'warn', 'info', 'debug'],
      customFilters: []
    };
    this.saveConfig();
  }

  // Restore original console
  restore() {
    console.log = this.originalConsole.log;
    console.error = this.originalConsole.error;
    console.warn = this.originalConsole.warn;
    console.info = this.originalConsole.info;
    console.debug = this.originalConsole.debug;
  }
}

// Create singleton instance
export const consoleLogControl = new ConsoleLogControl();

// Convenience functions for quick control
export const disableConsoleLogs = () => consoleLogControl.setEnabled(false);
export const enableConsoleLogs = () => consoleLogControl.setEnabled(true);
export const setConsoleLogLevel = (level: LogControlConfig['logLevel']) => consoleLogControl.setLogLevel(level);

// Production mode helper
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  // In production, default to only errors and warnings
  consoleLogControl.setLogLevel('warn');
}