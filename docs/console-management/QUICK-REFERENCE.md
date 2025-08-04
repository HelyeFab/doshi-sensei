# Console Log Management - Quick Reference

## 🚀 Quick Commands

### NPM Scripts
```bash
npm run console:scan          # Scan and report all console logs
npm run console:backup        # Create backup of current logs
npm run console:remove:dry    # Preview what would be removed
npm run console:remove        # Remove all console logs (with backup)
npm run console:restore       # Restore from latest backup
```

### Direct Script Usage
```bash
# Remove specific categories
node scripts/console-log-manager.js remove --categories debug,ui,performance

# Remove specific methods
node scripts/console-log-manager.js remove --methods log,debug

# Restore specific categories
node scripts/console-log-manager.js restore --categories auth,api

# Use specific backup file
node scripts/console-log-manager.js restore --backup console-logs-1234567890.json
```

## 🎯 Admin Interface

### Access
```
https://your-domain.com/admin/console-monitor
```

### Live Monitor Tab
- Real-time console log viewing
- Automatic categorization
- Click category cards to filter
- Search functionality
- Export as JSON

### Log Manager Tab
- **Scan Codebase**: Analyze all console logs
- **Runtime Control**: Filter logs without code changes
- **Selective Removal**: Remove by category/method
- **Restore**: Bring back removed logs

## 🎨 Log Categories

| Category | Icon | Description | Examples |
|----------|------|-------------|----------|
| SEO | 🔍 | SEO & metadata | meta tags, structured data, og: |
| Auth | 🛡️ | Authentication | login, user, token, permission |
| Stats | 📊 | Analytics | tracking, events, metrics |
| API | 🌐 | API calls | fetch, request, response |
| UI | 🎨 | UI/React | render, component, mount |
| Performance | ⚡ | Performance | slow, memory, cache |
| System | 🖥️ | System/Firebase | database, storage |
| Other | ⋯ | Uncategorized | everything else |

## 🔧 Runtime Control

### Quick Controls (Browser Console)
```javascript
// Disable all logs
consoleLogControl.setEnabled(false);

// Show only errors and warnings
consoleLogControl.setLogLevel('warn');

// Show only specific categories
consoleLogControl.setAllowedCategories(['auth', 'api']);

// Block specific categories
consoleLogControl.setBlockedCategories(['debug', 'ui']);

// Reset to defaults
consoleLogControl.reset();
```

### Log Levels
- `'all'` - Show everything
- `'debug'` - Debug and above
- `'info'` - Info and above
- `'warn'` - Warnings and errors only
- `'error'` - Errors only
- `'none'` - Hide all logs

## 📦 Backup & Restore

### Backup Location
```
/console-logs-backup/
└── console-logs-1234567890.json
```

### Backup Contents
- All console log locations
- Original code
- Categories and metadata
- File paths and line numbers

### What Gets Removed
```javascript
// Before
console.log('User logged in', userData);

// After removal
// CONSOLE_LOG_REMOVED:a1b2c3d4 console.log('User logged in', userData);
```

## ⚡ Quick Tips

### Development Workflow
1. Use runtime filtering during development
2. Don't remove logs until ready for production
3. Keep auth and error logs in production

### Before Deployment
1. Run `npm run console:scan` to review
2. Run `npm run console:remove --categories debug,ui`
3. Keep the backup for quick restoration

### Protected Logs
These are never removed:
- `console.error('CRITICAL...')`
- `console.warn('CRITICAL...')`
- Logs with "DO NOT REMOVE"
- Lines with `// @preserve-console`

### Best Practices
- ✅ Use categories in your logs: `console.log('[Auth] User login')`
- ✅ Create backups before major changes
- ✅ Use runtime filtering in development
- ❌ Don't log sensitive data
- ❌ Don't commit backup files

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Logs not showing | Check runtime filters, refresh page |
| Can't remove logs | Check file permissions, protected patterns |
| Restore failed | Verify backup exists, check file paths |
| API errors | Check admin authentication |

## 🔍 Find Specific Logs

```bash
# Find all console.error calls
node scripts/console-log-manager.js scan | grep -A2 "error"

# Find logs in specific file
node scripts/console-log-manager.js scan | grep -B2 "UserAuth.tsx"

# Count logs by category
node scripts/console-log-manager.js scan | grep -E "auth|api|stats"
```

---

**Need more help?** Check the full documentation at `/docs/console-management/README.md`