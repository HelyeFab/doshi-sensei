#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const glob = require('fast-glob');
const crypto = require('crypto');

// Configuration
const CONFIG = {
  // Directories to scan
  scanDirs: ['src', 'app', 'components', 'utils', 'hooks', 'contexts', 'lib', 'services'],
  
  // File extensions to process
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
  
  // Directories to ignore
  ignoreDirs: ['node_modules', '.next', 'dist', 'build', 'coverage', '.git'],
  
  // Files to ignore
  ignoreFiles: ['console-log-manager.js', 'consoleCapture.ts'],
  
  // Backup directory
  backupDir: 'console-logs-backup',
  
  // Console methods to track
  consoleMethods: ['log', 'error', 'warn', 'info', 'debug', 'trace', 'table', 'group', 'groupEnd', 'time', 'timeEnd'],
  
  // Comment marker for removed logs
  commentMarker: '// CONSOLE_LOG_REMOVED:',
  
  // Patterns to never remove (critical logs)
  protectedPatterns: [
    /console\.(error|warn)\s*\(\s*['"`]CRITICAL/i,
    /console\.\w+\s*\(\s*['"`]DO NOT REMOVE/i,
    /\/\/\s*@preserve-console/i
  ]
};

class ConsoleLogManager {
  constructor() {
    this.logs = [];
    this.backupData = null;
  }

  // Generate a unique ID for each log
  generateLogId(file, line, content) {
    const hash = crypto.createHash('md5');
    hash.update(`${file}:${line}:${content}`);
    return hash.digest('hex').substring(0, 8);
  }

  // Scan for all console logs in the codebase
  async scanConsoleLogs() {
    console.log('🔍 Scanning for console logs...');
    this.logs = [];

    const files = await this.getSourceFiles();
    
    for (const file of files) {
      await this.scanFile(file);
    }

    console.log(`✅ Found ${this.logs.length} console logs in ${files.length} files`);
    return this.logs;
  }

  // Get all source files to scan
  async getSourceFiles() {
    const patterns = CONFIG.scanDirs.flatMap(dir => 
      CONFIG.extensions.map(ext => `${dir}/**/*${ext}`)
    );

    const files = await glob(patterns, {
      ignore: CONFIG.ignoreDirs.map(dir => `**/${dir}/**`),
      nodir: true
    });

    // Filter out ignored files
    return files.filter(file => {
      const basename = path.basename(file);
      return !CONFIG.ignoreFiles.includes(basename);
    });
  }

  // Scan a single file for console logs
  async scanFile(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');

    // Regex to match console.* calls
    // This handles multi-line console statements
    const consoleRegex = new RegExp(
      `console\\.(${CONFIG.consoleMethods.join('|')})\\s*\\(`,
      'g'
    );

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      // Skip already commented logs
      if (line.trim().startsWith('//') || line.includes(CONFIG.commentMarker)) {
        return;
      }

      // Check for console statements
      const matches = line.matchAll(consoleRegex);
      
      for (const match of matches) {
        // Check if it's protected
        const isProtected = CONFIG.protectedPatterns.some(pattern => 
          pattern.test(line)
        );

        if (!isProtected) {
          const logId = this.generateLogId(filePath, lineNumber, line.trim());
          
          this.logs.push({
            id: logId,
            file: filePath,
            line: lineNumber,
            content: line.trim(),
            method: match[1],
            fullLine: line,
            indentation: line.match(/^(\s*)/)[1],
            multiLine: this.isMultiLineConsole(lines, index),
            category: this.detectCategory(line),
            timestamp: new Date().toISOString()
          });
        }
      }
    });
  }

  // Detect if console statement spans multiple lines
  isMultiLineConsole(lines, startIndex) {
    const line = lines[startIndex];
    let openParens = (line.match(/\(/g) || []).length;
    let closeParens = (line.match(/\)/g) || []).length;
    
    if (openParens === closeParens) {
      return { isMultiLine: false, endLine: startIndex + 1 };
    }

    // Find the closing parenthesis
    let endIndex = startIndex;
    for (let i = startIndex + 1; i < lines.length && i < startIndex + 10; i++) {
      openParens += (lines[i].match(/\(/g) || []).length;
      closeParens += (lines[i].match(/\)/g) || []).length;
      
      if (closeParens >= openParens) {
        endIndex = i;
        break;
      }
    }

    return {
      isMultiLine: true,
      endLine: endIndex + 1,
      lines: lines.slice(startIndex, endIndex + 1)
    };
  }

  // Detect log category based on content
  detectCategory(content) {
    const categories = {
      seo: /seo|meta|schema|structured.?data|og:|twitter:|canonical/i,
      auth: /auth|login|logout|user|uid|token|session|permission/i,
      stats: /stats|analytics|tracking|event|metric|usage/i,
      api: /api|fetch|request|response|endpoint|route|http/i,
      ui: /render|component|react|mount|unmount|update|dom/i,
      performance: /performance|slow|lag|memory|cache|optimize/i,
      system: /system|firebase|firestore|storage|database/i,
      debug: /debug|test|temp|todo|fixme/i,
      error: /error|exception|fail|catch/i
    };

    for (const [category, pattern] of Object.entries(categories)) {
      if (pattern.test(content)) {
        return category;
      }
    }

    return 'other';
  }

  // Create backup of current console logs
  async createBackup() {
    console.log('💾 Creating backup...');
    
    const backupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      totalLogs: this.logs.length,
      logsByFile: {},
      logsByCategory: {},
      logs: this.logs
    };

    // Group logs by file
    this.logs.forEach(log => {
      if (!backupData.logsByFile[log.file]) {
        backupData.logsByFile[log.file] = [];
      }
      backupData.logsByFile[log.file].push(log.id);

      // Group by category
      if (!backupData.logsByCategory[log.category]) {
        backupData.logsByCategory[log.category] = [];
      }
      backupData.logsByCategory[log.category].push(log.id);
    });

    // Save backup
    const backupPath = path.join(
      CONFIG.backupDir,
      `console-logs-${Date.now()}.json`
    );

    await fs.mkdir(CONFIG.backupDir, { recursive: true });
    await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));

    console.log(`✅ Backup saved to: ${backupPath}`);
    this.backupData = backupData;
    return backupPath;
  }

  // Remove console logs (comment them out)
  async removeConsoleLogs(options = {}) {
    const {
      categories = null, // Array of categories to remove, null = all
      files = null, // Array of files to process, null = all
      methods = null, // Array of methods to remove (log, error, etc), null = all
      dryRun = false // If true, don't actually modify files
    } = options;

    console.log('🗑️  Removing console logs...');
    
    // Filter logs based on options
    let logsToRemove = this.logs.filter(log => {
      if (categories && !categories.includes(log.category)) return false;
      if (files && !files.includes(log.file)) return false;
      if (methods && !methods.includes(log.method)) return false;
      return true;
    });

    console.log(`Will remove ${logsToRemove.length} logs`);

    if (dryRun) {
      console.log('DRY RUN - No files will be modified');
      return logsToRemove;
    }

    // Group logs by file
    const logsByFile = {};
    logsToRemove.forEach(log => {
      if (!logsByFile[log.file]) {
        logsByFile[log.file] = [];
      }
      logsByFile[log.file].push(log);
    });

    // Process each file
    for (const [filePath, logs] of Object.entries(logsByFile)) {
      await this.removeLogsFromFile(filePath, logs);
    }

    console.log(`✅ Removed ${logsToRemove.length} console logs`);
    return logsToRemove;
  }

  // Remove logs from a single file
  async removeLogsFromFile(filePath, logs) {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');

    // Sort logs by line number in reverse order (process from bottom to top)
    logs.sort((a, b) => b.line - a.line);

    logs.forEach(log => {
      const lineIndex = log.line - 1;
      
      if (log.multiLine.isMultiLine) {
        // Handle multi-line console statements
        const startLine = lineIndex;
        const endLine = log.multiLine.endLine - 1;
        
        // Comment out all lines
        for (let i = startLine; i <= endLine; i++) {
          if (i === startLine) {
            lines[i] = `${log.indentation}${CONFIG.commentMarker}${log.id} ${lines[i].trim()}`;
          } else {
            lines[i] = `${log.indentation}// ${lines[i].trim()}`;
          }
        }
      } else {
        // Single line console statement
        lines[lineIndex] = `${log.indentation}${CONFIG.commentMarker}${log.id} ${lines[lineIndex].trim()}`;
      }
    });

    await fs.writeFile(filePath, lines.join('\n'));
  }

  // Restore previously removed console logs
  async restoreConsoleLogs(options = {}) {
    const {
      backupFile = null, // Specific backup file to use
      logIds = null, // Array of specific log IDs to restore, null = all
      categories = null, // Array of categories to restore
      files = null // Array of files to restore in
    } = options;

    console.log('♻️  Restoring console logs...');

    // Load backup data
    if (!this.backupData && backupFile) {
      const backupPath = path.join(CONFIG.backupDir, backupFile);
      const backupContent = await fs.readFile(backupPath, 'utf8');
      this.backupData = JSON.parse(backupContent);
    }

    if (!this.backupData) {
      throw new Error('No backup data available');
    }

    // Find all commented logs in files
    const files = await this.getSourceFiles();
    let restoredCount = 0;

    for (const file of files) {
      if (options.files && !options.files.includes(file)) continue;
      
      const restored = await this.restoreLogsInFile(file, {
        logIds,
        categories,
        backupData: this.backupData
      });
      
      restoredCount += restored;
    }

    console.log(`✅ Restored ${restoredCount} console logs`);
    return restoredCount;
  }

  // Restore logs in a single file
  async restoreLogsInFile(filePath, options) {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    let restoredCount = 0;

    const commentRegex = new RegExp(`${CONFIG.commentMarker}([a-f0-9]{8})\\s+(.+)$`);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(commentRegex);
      
      if (match) {
        const logId = match[1];
        const originalContent = match[2];
        
        // Check if we should restore this log
        const logData = options.backupData.logs.find(log => log.id === logId);
        
        if (logData) {
          if (options.logIds && !options.logIds.includes(logId)) continue;
          if (options.categories && !options.categories.includes(logData.category)) continue;
          
          // Restore the log
          lines[i] = `${logData.indentation}${originalContent}`;
          
          // Handle multi-line restoration
          if (logData.multiLine.isMultiLine) {
            // Uncomment subsequent lines
            for (let j = i + 1; j < i + (logData.multiLine.endLine - logData.line); j++) {
              if (lines[j].trim().startsWith('//')) {
                lines[j] = lines[j].replace(/^(\s*)\/\/\s*/, '$1');
              }
            }
          }
          
          restoredCount++;
        }
      }
    }

    if (restoredCount > 0) {
      await fs.writeFile(filePath, lines.join('\n'));
    }

    return restoredCount;
  }

  // Generate report of console logs
  async generateReport() {
    const report = {
      summary: {
        total: this.logs.length,
        byMethod: {},
        byCategory: {},
        byFile: {}
      },
      details: []
    };

    // Count by method
    CONFIG.consoleMethods.forEach(method => {
      report.summary.byMethod[method] = this.logs.filter(log => log.method === method).length;
    });

    // Count by category
    const categories = [...new Set(this.logs.map(log => log.category))];
    categories.forEach(category => {
      report.summary.byCategory[category] = this.logs.filter(log => log.category === category).length;
    });

    // Count by file
    const files = [...new Set(this.logs.map(log => log.file))];
    files.forEach(file => {
      const count = this.logs.filter(log => log.file === file).length;
      if (count > 0) {
        report.summary.byFile[file] = count;
      }
    });

    // Add top 10 files with most logs
    report.topFiles = Object.entries(report.summary.byFile)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([file, count]) => ({ file, count }));

    return report;
  }
}

// CLI Interface
async function main() {
  const manager = new ConsoleLogManager();
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'scan':
        await manager.scanConsoleLogs();
        const report = await manager.generateReport();
        console.log('\n📊 Report:');
        console.log(JSON.stringify(report, null, 2));
        break;

      case 'backup':
        await manager.scanConsoleLogs();
        await manager.createBackup();
        break;

      case 'remove':
        await manager.scanConsoleLogs();
        await manager.createBackup();
        
        const removeOptions = {
          dryRun: args.includes('--dry-run'),
          categories: args.includes('--categories') ? args[args.indexOf('--categories') + 1].split(',') : null,
          methods: args.includes('--methods') ? args[args.indexOf('--methods') + 1].split(',') : null
        };
        
        await manager.removeConsoleLogs(removeOptions);
        break;

      case 'restore':
        const restoreOptions = {
          backupFile: args.includes('--backup') ? args[args.indexOf('--backup') + 1] : null,
          categories: args.includes('--categories') ? args[args.indexOf('--categories') + 1].split(',') : null
        };
        
        await manager.restoreConsoleLogs(restoreOptions);
        break;

      case 'help':
      default:
        console.log(`
Console Log Manager - Safely manage console logs in your codebase

Usage: node console-log-manager.js <command> [options]

Commands:
  scan                 Scan codebase for console logs and generate report
  backup              Create backup of all console logs
  remove              Remove (comment out) console logs
  restore             Restore previously removed console logs
  help                Show this help message

Options:
  --dry-run           Don't modify files, just show what would be done
  --categories <list> Comma-separated list of categories (seo,auth,stats,etc)
  --methods <list>    Comma-separated list of methods (log,error,warn,etc)
  --backup <file>     Backup file to use for restoration

Examples:
  # Scan and report
  node console-log-manager.js scan

  # Remove all console.log and console.debug
  node console-log-manager.js remove --methods log,debug

  # Remove only auth and api logs
  node console-log-manager.js remove --categories auth,api

  # Dry run to see what would be removed
  node console-log-manager.js remove --dry-run

  # Restore from specific backup
  node console-log-manager.js restore --backup console-logs-1234567890.json
        `);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = ConsoleLogManager;

// Run if called directly
if (require.main === module) {
  main();
}