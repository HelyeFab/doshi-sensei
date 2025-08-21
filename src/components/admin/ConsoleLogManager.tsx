'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { consoleLogControl } from '@/utils/consoleLogControl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  Upload,
  Trash2,
  RefreshCw,
  Save,
  AlertCircle,
  Check,
  X,
  Plus,
  Filter,
  Terminal,
  Code,
  FileText
} from 'lucide-react';
import { SimpleTooltip } from '@/components/ui/tooltip';

interface ConsoleLogStats {
  total: number;
  byMethod: Record<string, number>;
  byCategory: Record<string, number>;
  topFiles: Array<{ file: string; count: number }>;
}

export function ConsoleLogManager() {
  const { user } = useAuth();
  const [config, setConfig] = useState(consoleLogControl.getConfig());
  const [stats, setStats] = useState<ConsoleLogStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [customFilterInput, setCustomFilterInput] = useState('');
  const [backupFiles, setBackupFiles] = useState<string[]>([]);

  useEffect(() => {
    // Load initial config
    setConfig(consoleLogControl.getConfig());
  }, []);

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleScan = async () => {
    setLoading(true);
    try {
      const token = await user?.getIdToken();
      
      const response = await fetch('/api/admin/console-logs/scan', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to scan');
      
      const data = await response.json();
      setStats(data.report.summary);
      showMessage('success', `Found ${data.report.summary.total} console logs`);
    } catch (error) {
      showMessage('error', 'Failed to scan console logs');
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    setLoading(true);
    try {
      const token = await user?.getIdToken();
      
      const response = await fetch('/api/admin/console-logs/backup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to backup');
      
      const data = await response.json();
      showMessage('success', `Backup created: ${data.backupFile}`);
      loadBackupFiles();
    } catch (error) {
      showMessage('error', 'Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (options: any) => {
    if (!confirm('Are you sure you want to remove console logs? A backup will be created first.')) {
      return;
    }

    setLoading(true);
    try {
      const token = await user?.getIdToken();
      
      const response = await fetch('/api/admin/console-logs/remove', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(options)
      });

      if (!response.ok) throw new Error('Failed to remove');
      
      const data = await response.json();
      showMessage('success', `Removed ${data.removed.length} console logs`);
    } catch (error) {
      showMessage('error', 'Failed to remove console logs');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (backupFile?: string) => {
    setLoading(true);
    try {
      const token = await user?.getIdToken();
      
      const response = await fetch('/api/admin/console-logs/restore', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ backupFile })
      });

      if (!response.ok) throw new Error('Failed to restore');
      
      const data = await response.json();
      showMessage('success', `Restored ${data.restored} console logs`);
    } catch (error) {
      showMessage('error', 'Failed to restore console logs');
    } finally {
      setLoading(false);
    }
  };

  const loadBackupFiles = async () => {
    try {
      const token = await user?.getIdToken();
      
      const response = await fetch('/api/admin/console-logs/backups', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBackupFiles(data.backups);
      }
    } catch (error) {
      console.error('Failed to load backup files:', error);
    }
  };

  const updateConfig = (updates: Partial<typeof config>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    
    // Apply to runtime
    if (updates.enabled !== undefined) consoleLogControl.setEnabled(updates.enabled);
    if (updates.logLevel !== undefined) consoleLogControl.setLogLevel(updates.logLevel);
    if (updates.allowedCategories !== undefined) consoleLogControl.setAllowedCategories(updates.allowedCategories);
    if (updates.blockedCategories !== undefined) consoleLogControl.setBlockedCategories(updates.blockedCategories);
    if (updates.allowedFiles !== undefined) consoleLogControl.setAllowedFiles(updates.allowedFiles);
    if (updates.blockedFiles !== undefined) consoleLogControl.setBlockedFiles(updates.blockedFiles);
    if (updates.allowedMethods !== undefined) consoleLogControl.setAllowedMethods(updates.allowedMethods);
  };

  const addCustomFilter = () => {
    if (customFilterInput) {
      consoleLogControl.addCustomFilter(customFilterInput, 'block');
      setConfig(consoleLogControl.getConfig());
      setCustomFilterInput('');
      showMessage('success', 'Custom filter added');
    }
  };

  const removeCustomFilter = (index: number) => {
    consoleLogControl.removeCustomFilter(index);
    setConfig(consoleLogControl.getConfig());
  };

  return (
    <div className="space-y-6">
      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-800' :
          message.type === 'error' ? 'bg-red-50 text-red-800' :
          'bg-blue-50 text-blue-800'
        }`}>
          {message.type === 'success' && <Check className="h-4 w-4" />}
          {message.type === 'error' && <X className="h-4 w-4" />}
          {message.type === 'info' && <AlertCircle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Console Log Management</CardTitle>
          <CardDescription>
            Scan, backup, remove, and restore console logs in your codebase
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={handleScan} disabled={loading}>
            <Terminal className="h-4 w-4 mr-2" />
            Scan Codebase
          </Button>
          <Button onClick={handleBackup} disabled={loading} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Create Backup
          </Button>
          <Button 
            onClick={() => handleRemove({ dryRun: true })} 
            disabled={loading} 
            variant="outline"
          >
            <Code className="h-4 w-4 mr-2" />
            Dry Run Remove
          </Button>
          <Button 
            onClick={() => handleRemove({})} 
            disabled={loading} 
            variant="destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove All Logs
          </Button>
        </CardContent>
      </Card>

      {/* Stats Display */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Console Log Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-medium mb-2">By Method</h4>
                <div className="space-y-1">
                  {Object.entries(stats.byMethod).map(([method, count]) => (
                    <div key={method} className="flex justify-between text-sm">
                      <span className="capitalize">{method}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">By Category</h4>
                <div className="space-y-1">
                  {Object.entries(stats.byCategory).map(([category, count]) => (
                    <div key={category} className="flex justify-between text-sm">
                      <span className="capitalize">{category}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Top Files</h4>
                <div className="space-y-1">
                  {stats.topFiles.slice(0, 5).map(({ file, count }) => (
                    <div key={file} className="flex justify-between text-sm">
                      <span className="truncate" title={file}>
                        {file.split('/').pop()}
                      </span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Runtime Configuration */}
      <Tabs defaultValue="runtime" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="runtime">Runtime Control</TabsTrigger>
          <TabsTrigger value="selective">Selective Removal</TabsTrigger>
          <TabsTrigger value="restore">Restore Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="runtime" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Runtime Log Control</CardTitle>
              <CardDescription>
                Control which console logs are shown in the browser console
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Console Logs Enabled</label>
                <Button
                  size="sm"
                  variant={config.enabled ? "default" : "outline"}
                  onClick={() => updateConfig({ enabled: !config.enabled })}
                >
                  {config.enabled ? "Enabled" : "Disabled"}
                </Button>
              </div>

              {/* Log Level */}
              <div>
                <label className="text-sm font-medium mb-2 block">Log Level</label>
                <div className="flex gap-2">
                  {['all', 'debug', 'info', 'warn', 'error', 'none'].map(level => (
                    <Button
                      key={level}
                      size="sm"
                      variant={config.logLevel === level ? "default" : "outline"}
                      onClick={() => updateConfig({ logLevel: level as any })}
                    >
                      {level}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Allowed Methods */}
              <div>
                <label className="text-sm font-medium mb-2 block">Allowed Methods</label>
                <div className="flex gap-2">
                  {['log', 'error', 'warn', 'info', 'debug'].map(method => (
                    <label key={method} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={config.allowedMethods.includes(method)}
                        onChange={(e) => {
                          const methods = e.target.checked
                            ? [...config.allowedMethods, method]
                            : config.allowedMethods.filter(m => m !== method);
                          updateConfig({ allowedMethods: methods });
                        }}
                      />
                      <span className="text-sm">{method}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom Filters */}
              <div>
                <label className="text-sm font-medium mb-2 block">Custom Filters</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={customFilterInput}
                    onChange={(e) => setCustomFilterInput(e.target.value)}
                    placeholder="Add pattern to block..."
                    className="flex-1 px-3 py-1 text-sm border rounded-md"
                  />
                  <Button size="sm" onClick={addCustomFilter}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1">
                  {config.customFilters.map((filter, index) => (
                    <div key={index} className="flex items-center justify-between text-sm bg-gray-50 px-2 py-1 rounded">
                      <code>{filter.pattern.source}</code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeCustomFilter(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="selective" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Selective Log Removal</CardTitle>
              <CardDescription>
                Remove specific types of console logs from your codebase
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Remove by Category</h4>
                  <div className="space-y-2">
                    {['debug', 'ui', 'performance', 'other'].map(category => (
                      <Button
                        key={category}
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleRemove({ categories: [category] })}
                        disabled={loading}
                      >
                        Remove {category} logs
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Remove by Method</h4>
                  <div className="space-y-2">
                    {['log', 'debug', 'info'].map(method => (
                      <Button
                        key={method}
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleRemove({ methods: [method] })}
                        disabled={loading}
                      >
                        Remove console.{method}()
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="restore" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Restore Console Logs</CardTitle>
              <CardDescription>
                Restore previously removed console logs from backups
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {backupFiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No backup files found</p>
                ) : (
                  backupFiles.map(file => (
                    <div key={file} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">{file}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(file)}
                        disabled={loading}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                    </div>
                  ))
                )}
              </div>
              <Button
                className="mt-4"
                variant="outline"
                onClick={loadBackupFiles}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Backups
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}