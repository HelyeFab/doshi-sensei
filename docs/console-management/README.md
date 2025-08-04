# Console Log Management System

## Overview

The Console Log Management System is a comprehensive solution for managing console logs in the Doshi Sensei codebase. It provides tools to scan, categorize, backup, remove, and restore console logs, along with runtime filtering capabilities and a dedicated admin interface.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Features](#features)
3. [Quick Start Guide](#quick-start-guide)
4. [User Guide](#user-guide)
5. [Technical Implementation](#technical-implementation)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

## System Architecture

The system consists of four main components:

### 1. **Console Log Scanner** (`/scripts/console-log-manager.js`)
- Node.js script that scans the entire codebase
- Categorizes logs automatically (SEO, auth, stats, API, UI, performance, system)
- Creates backups before modifications
- Comments out logs instead of deleting them for easy restoration

### 2. **Enhanced Console Monitor** (`/src/utils/enhancedConsoleCapture.ts`)
- Captures all console output in real-time
- Automatically categorizes logs based on content
- Provides filtering and search capabilities
- Tracks source files and stack traces

### 3. **Runtime Log Control** (`/src/utils/consoleLogControl.ts`)
- Controls which logs appear in the browser console
- Persists settings in localStorage
- Filters by level, category, method, and custom patterns
- Production mode defaults to warnings/errors only

### 4. **Admin Interface** (`/admin/console-monitor`)
- Live monitor tab for real-time log viewing
- Log manager tab for codebase scanning and manipulation
- Visual statistics and categorization
- Export/import functionality

## Features

### Real-Time Monitoring
- Live categorized log display
- Visual statistics by category
- Search and filter capabilities
- Export logs as JSON
- Source file tracking

### Codebase Management
- Scan entire codebase for console logs
- Automatic categorization
- Safe removal (comments out, doesn't delete)
- Easy restoration from backups
- Selective removal by category or method

### Runtime Control
- Filter logs without modifying code
- Control by log level (all, debug, info, warn, error, none)
- Filter by category or source file
- Custom pattern matching
- Settings persist across sessions

### Safety Features
- Never deletes code - only comments out
- Automatic backups before any changes
- Unique IDs for each removed log
- Protected patterns (CRITICAL, DO NOT REMOVE)
- Full reversibility

## Quick Start Guide

### For Developers

#### 1. Access the Console Monitor
Navigate to: `https://your-domain.com/admin/console-monitor`

#### 2. View Live Logs
- Click on the "Live Monitor" tab
- Logs are automatically categorized and color-coded
- Click on category cards to filter

#### 3. Manage Console Logs
- Click on the "Log Manager" tab
- Use the available actions:
  - **Scan Codebase**: Analyze all console logs
  - **Create Backup**: Save current state
  - **Dry Run Remove**: Preview what would be removed
  - **Remove All Logs**: Comment out all console logs

### Using CLI Commands

```bash
# Scan and generate report
npm run console:scan

# Create backup of all console logs
npm run console:backup

# Preview what would be removed (dry run)
npm run console:remove:dry

# Remove all console logs (creates backup first)
npm run console:remove

# Restore from latest backup
npm run console:restore
```

## User Guide

### Live Monitor Tab

The Live Monitor provides real-time console log viewing with:

1. **Category Statistics**: Visual cards showing log counts by category
2. **Filter Controls**: Filter by log type (log, error, warn, info, debug)
3. **Category Tabs**: View logs by specific category
4. **Search**: Find specific logs by content
5. **Auto-scroll**: Automatically scroll to new logs
6. **Export**: Download logs as JSON

### Log Manager Tab

The Log Manager provides codebase-level console log management:

#### Runtime Control Section
- **Enable/Disable**: Toggle all console logs on/off
- **Log Level**: Set minimum log level (e.g., only errors in production)
- **Allowed Methods**: Choose which console methods to allow
- **Custom Filters**: Add regex patterns to block specific logs

#### Selective Removal Section
- **By Category**: Remove only specific types (debug, UI, performance, etc.)
- **By Method**: Remove only console.log, console.debug, etc.
- **Dry Run**: Preview changes without modifying files

#### Restore Section
- View all available backups
- Restore from any previous backup
- Selective restoration by category

### CLI Usage

#### Basic Commands

```bash
# Scan codebase and see statistics
npm run console:scan
```

Output shows:
- Total console logs found
- Breakdown by method (log, error, warn, etc.)
- Breakdown by category
- Top files with most logs

#### Advanced Usage

```bash
# Remove only debug and UI logs
node scripts/console-log-manager.js remove --categories debug,ui

# Remove only console.log and console.debug
node scripts/console-log-manager.js remove --methods log,debug

# Dry run to see what would be removed
node scripts/console-log-manager.js remove --dry-run

# Restore from specific backup
node scripts/console-log-manager.js restore --backup console-logs-1704567890.json

# Restore only auth and api logs
node scripts/console-log-manager.js restore --categories auth,api
```

### Runtime Filtering

The runtime control system allows you to filter console logs without modifying code:

#### In Development
```javascript
// Disable all console logs
consoleLogControl.setEnabled(false);

// Show only errors and warnings
consoleLogControl.setLogLevel('warn');

// Show only specific categories
consoleLogControl.setAllowedCategories(['auth', 'api']);

// Block specific files
consoleLogControl.setBlockedFiles(['useStats.ts', 'analytics.ts']);
```

#### Production Configuration
The system automatically sets production to show only warnings and errors.

## Technical Implementation

### How Logs Are Categorized

The system uses pattern matching to categorize logs:

- **SEO**: Matches "seo", "meta", "schema", "og:", etc.
- **Auth**: Matches "auth", "login", "user", "token", etc.
- **Stats**: Matches "stats", "analytics", "tracking", etc.
- **API**: Matches "api", "fetch", "request", "response", etc.
- **UI**: Matches "render", "component", "react", etc.
- **Performance**: Matches "performance", "slow", "memory", etc.
- **System**: Matches "firebase", "database", "storage", etc.
- **Other**: Everything else

### How Removal Works

When removing logs, the system:

1. Scans files for console statements
2. Generates unique IDs for each log
3. Comments out the log with its ID: `// CONSOLE_LOG_REMOVED:abc123 console.log(...)`
4. Preserves indentation and formatting
5. Handles multi-line console statements

### How Restoration Works

When restoring logs:

1. Searches for commented logs with IDs
2. Matches IDs with backup data
3. Uncomments the original code
4. Preserves exact formatting

### Protected Patterns

The following patterns are never removed:
- `console.error('CRITICAL...')`
- `console.warn('CRITICAL...')`
- Any log with "DO NOT REMOVE"
- Lines with `// @preserve-console`

## Best Practices

### When to Remove Console Logs

1. **Before Production Deployment**
   - Remove debug and development logs
   - Keep critical error logging
   - Use selective removal by category

2. **During Development**
   - Use runtime filtering instead of removal
   - Set appropriate log levels
   - Filter by category for focused debugging

### Backup Strategy

1. **Always Create Backups**
   - Before major removals
   - Before deployments
   - Keep recent backups for quick restoration

2. **Backup Naming**
   - Backups are timestamped automatically
   - Store in `console-logs-backup/` directory
   - Add to `.gitignore` to avoid committing

### Runtime Configuration

1. **Development Settings**
   ```javascript
   // Show all logs in development
   consoleLogControl.setLogLevel('all');
   ```

2. **Production Settings**
   ```javascript
   // Show only warnings and errors
   consoleLogControl.setLogLevel('warn');
   ```

3. **Debugging Specific Features**
   ```javascript
   // Show only auth-related logs
   consoleLogControl.setAllowedCategories(['auth']);
   ```

## Troubleshooting

### Common Issues

#### "Module not found" Error
- **Cause**: Path resolution issues in API routes
- **Solution**: Already fixed using dynamic requires

#### Logs Not Appearing in Monitor
- **Check**: Is enhanced console capture initialized?
- **Check**: Are there any runtime filters active?
- **Solution**: Check browser console for initialization messages

#### Removal Not Working
- **Check**: Do you have write permissions?
- **Check**: Are the files protected patterns?
- **Solution**: Run with appropriate permissions

#### Restoration Failing
- **Check**: Does the backup file exist?
- **Check**: Are the file paths still valid?
- **Solution**: Verify backup integrity

### Debug Mode

Enable debug output:
```bash
DEBUG=console-manager npm run console:scan
```

### Manual Testing

Test the console capture:
1. Open the console monitor page
2. Click "Trigger Test Logs"
3. Verify logs appear categorized correctly

## Security Considerations

1. **Admin Only Access**
   - Console monitor is restricted to admin users
   - API routes check authentication
   - No sensitive data in logs

2. **Production Safety**
   - Never log sensitive data (passwords, tokens)
   - Use environment-specific logging
   - Review logs before deployment

3. **Backup Security**
   - Don't commit backup files
   - Store backups securely
   - Rotate old backups

## Future Enhancements

Potential improvements:
- Cloud backup storage
- Log analytics and trends
- Automated log cleanup policies
- Integration with monitoring services
- Custom category definitions
- Team collaboration features

---

*Last Updated: January 2025*
*Version: 1.0.0*