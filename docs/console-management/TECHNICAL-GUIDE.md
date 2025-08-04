# Console Log Management - Technical Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Admin Interface                            │
│  ┌─────────────────────┐        ┌────────────────────────────┐  │
│  │   Live Monitor Tab   │        │    Log Manager Tab         │  │
│  │  - Real-time logs    │        │  - Scan codebase          │  │
│  │  - Categories        │        │  - Remove/Restore         │  │
│  │  - Search & Filter   │        │  - Runtime control        │  │
│  └─────────────────────┘        └────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                    │                              │
                    ▼                              ▼
┌─────────────────────────────┐    ┌─────────────────────────────┐
│  Enhanced Console Capture    │    │    Console Log Manager      │
│  - Real-time interception   │    │  - AST-like scanning        │
│  - Auto-categorization      │    │  - Safe removal             │
│  - Browser integration      │    │  - Backup/Restore           │
└─────────────────────────────┘    └─────────────────────────────┘
                    │                              │
                    ▼                              ▼
┌─────────────────────────────┐    ┌─────────────────────────────┐
│   Runtime Log Control       │    │      File System            │
│  - localStorage config      │    │  - Source files             │
│  - Dynamic filtering        │    │  - Backup files             │
│  - Production defaults      │    │  - Comment preservation     │
└─────────────────────────────┘    └─────────────────────────────┘
```

## Component Details

### 1. Console Log Scanner (`/scripts/console-log-manager.js`)

#### Key Classes and Methods

```javascript
class ConsoleLogManager {
  // Properties
  logs: Array<LogEntry>           // All discovered logs
  backupData: BackupData         // Backup metadata
  
  // Core Methods
  scanConsoleLogs()              // Scan entire codebase
  createBackup()                 // Create JSON backup
  removeConsoleLogs(options)     // Comment out logs
  restoreConsoleLogs(options)    // Restore from backup
  generateReport()               // Generate statistics
}
```

#### Log Entry Structure

```javascript
interface LogEntry {
  id: string;                    // Unique 8-char hash
  file: string;                  // File path
  line: number;                  // Line number
  content: string;               // Trimmed line content
  method: string;                // console method (log, error, etc)
  fullLine: string;              // Complete line with whitespace
  indentation: string;           // Leading whitespace
  multiLine: {                   // Multi-line detection
    isMultiLine: boolean;
    endLine: number;
    lines: string[];
  };
  category: string;              // Auto-detected category
  timestamp: string;             // ISO timestamp
}
```

#### Scanning Algorithm

1. **File Discovery**
   - Uses `fast-glob` for efficient file scanning
   - Configurable directories and extensions
   - Ignores node_modules, build outputs

2. **Pattern Matching**
   - Regex: `/console\.(log|error|warn|info|debug|trace|table|group|groupEnd|time|timeEnd)\s*\(/g`
   - Handles multi-line console statements
   - Preserves exact formatting

3. **Category Detection**
   - Pattern-based categorization
   - Falls back to 'other' if no match
   - Categories defined in `detectCategory()` method

#### Removal Process

```javascript
// Original code
console.log('User action', { data });

// After removal (with ID for restoration)
// CONSOLE_LOG_REMOVED:a1b2c3d4 console.log('User action', { data });
```

### 2. Enhanced Console Capture (`/src/utils/enhancedConsoleCapture.ts`)

#### Console Method Interception

```typescript
class EnhancedConsoleCapture {
  private originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
  };

  startCapture() {
    // Override each console method
    console.log = (...args: any[]) => {
      this.captureLog('log', args);
      this.originalConsole.log.apply(console, args);
    };
    // ... similar for other methods
  }
}
```

#### Log Categorization Logic

```typescript
private categoryPatterns = [
  { pattern: /seo|meta|schema|structured.?data|og:|twitter:|canonical/i, category: 'seo' },
  { pattern: /auth|login|logout|user|uid|token|session|permission/i, category: 'auth' },
  { pattern: /stats|analytics|tracking|event|metric|usage/i, category: 'stats' },
  { pattern: /api|fetch|request|response|endpoint|route|http/i, category: 'api' },
  { pattern: /render|component|react|mount|unmount|update|dom/i, category: 'ui' },
  { pattern: /performance|slow|lag|memory|cache|optimize/i, category: 'performance' },
  { pattern: /system|firebase|firestore|storage|database/i, category: 'system' },
];
```

#### Source File Detection

```typescript
private extractSourceFile(stack: string): string {
  const lines = stack.split('\n');
  for (const line of lines) {
    if (!line.includes('enhancedConsoleCapture')) {
      const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
      if (match) return match[2].split('/').pop() || '';
    }
  }
  return '';
}
```

### 3. Runtime Log Control (`/src/utils/consoleLogControl.ts`)

#### Configuration Structure

```typescript
interface LogControlConfig {
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
```

#### Filtering Logic

```typescript
private shouldLog(method: string, args: any[]): boolean {
  // 1. Check if enabled
  if (!this.config.enabled) return false;

  // 2. Check log level
  const methodPriority = this.logLevelPriority[method];
  const configPriority = this.logLevelPriority[this.config.logLevel];
  if (methodPriority > configPriority) return false;

  // 3. Check method filter
  if (!this.config.allowedMethods.includes(method)) return false;

  // 4. Extract context
  const message = args.join(' ');
  const sourceFile = this.extractSourceFile(new Error().stack);
  const category = this.detectCategory(message);

  // 5. Apply filters
  // ... file, category, and custom filters
  
  return true;
}
```

### 4. API Routes Integration

#### Authentication Flow
```typescript
// All API routes follow this pattern
export async function POST(request: NextRequest) {
  // 1. Check session
  const session = await getServerSession();
  
  // 2. Verify admin access
  const adminCheck = await adminGuard(request);
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  // 3. Execute operation
  const ConsoleLogManager = require('../../../../../scripts/console-log-manager');
  const manager = new ConsoleLogManager();
  // ... perform operations
}
```

## Data Flow

### Scanning Flow
```
User clicks "Scan" → API Route → ConsoleLogManager
                                       ↓
                              Scan all source files
                                       ↓
                              Build log entries array
                                       ↓
                              Generate statistics
                                       ↓
                              Return JSON response → Update UI
```

### Removal Flow
```
User selects options → API Route → Create backup
                                        ↓
                               Process each file
                                        ↓
                               Comment out logs
                                        ↓
                               Save files → Return results
```

### Runtime Filter Flow
```
Console method called → shouldLog() check → Block or Allow
                              ↓
                    Check all filters
                              ↓
                    Apply to browser console
```

## Performance Considerations

### Scanning Optimization
- Uses `fast-glob` for efficient file discovery
- Processes files in parallel where possible
- Limits regex backtracking with specific patterns
- Caches compiled regex patterns

### Memory Management
- Limits stored logs to 500-1000 entries
- Uses circular buffer for log storage
- Cleans up old backups automatically
- Efficient string operations for large files

### Runtime Performance
- Minimal overhead for console interception
- Early returns in filter checks
- LocalStorage for config (no network calls)
- Lazy initialization in production

## Security Considerations

### Admin Access
- All API routes require admin authentication
- Session validation on every request
- No client-side file system access
- Audit logs for all operations

### Code Safety
- Never executes removed code
- Preserves all code structure
- Unique IDs prevent collisions
- Backup verification before restore

### Data Protection
- No sensitive data in backups
- Backups stored locally only
- Git-ignored backup directory
- No cloud transmission by default

## Extension Points

### Adding New Categories

```javascript
// In console-log-manager.js
detectCategory(content) {
  const categories = {
    seo: /seo|meta|schema/i,
    auth: /auth|login|user/i,
    // Add new category here
    payment: /payment|stripe|subscription/i,
  };
  // ...
}
```

### Custom Filters

```typescript
// Add custom filter at runtime
consoleLogControl.addCustomFilter(
  /confidential|secret|private/i,
  'block'
);
```

### Integration Hooks

```javascript
// Before removal hook
manager.beforeRemove = (log) => {
  // Custom logic
  return true; // Allow removal
};

// After restore hook
manager.afterRestore = (log) => {
  // Custom logic
};
```

## Testing

### Unit Testing Console Scanner
```javascript
describe('ConsoleLogManager', () => {
  it('should detect multi-line console statements', () => {
    const content = `
      console.log('Test',
        { data: value },
        'end');
    `;
    const result = manager.scanContent(content);
    expect(result[0].multiLine.isMultiLine).toBe(true);
  });
});
```

### Integration Testing
```javascript
// Test full removal and restoration cycle
it('should preserve exact code formatting', async () => {
  const manager = new ConsoleLogManager();
  await manager.scanConsoleLogs();
  const backup = await manager.createBackup();
  await manager.removeConsoleLogs();
  await manager.restoreConsoleLogs({ backupFile: backup });
  // Verify files are identical
});
```

### E2E Testing Admin Interface
```javascript
// Cypress test example
describe('Console Monitor', () => {
  it('should display categorized logs', () => {
    cy.visit('/admin/console-monitor');
    cy.contains('Trigger Test Logs').click();
    cy.get('[data-category="auth"]').should('exist');
    cy.get('[data-category="api"]').should('exist');
  });
});
```

## Debugging

### Enable Debug Mode
```bash
# Set debug environment variable
DEBUG=console-manager npm run console:scan
```

### Common Issues

#### Scanner Not Finding Logs
```javascript
// Check scanning config
console.log('CONFIG:', CONFIG);
console.log('Scan dirs:', CONFIG.scanDirs);
console.log('Extensions:', CONFIG.extensions);
```

#### Category Misidentification
```javascript
// Test category detection
const testLog = "console.log('[Auth] User login')";
console.log('Category:', manager.detectCategory(testLog));
```

#### Restoration Failures
```javascript
// Verify backup integrity
const backup = JSON.parse(fs.readFileSync('backup.json'));
console.log('Backup logs:', backup.logs.length);
console.log('First log:', backup.logs[0]);
```

---

*For implementation details, see the source files referenced above.*