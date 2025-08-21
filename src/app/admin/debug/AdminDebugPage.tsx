'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminStatsDebugPanel } from '@/components/admin/StatsDebugPanel';
import { StatsDebugSummary } from '@/components/debug/StatsDebugSummary';
import { ConsoleMonitor } from '@/components/admin/ConsoleMonitor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Info, HelpCircle } from 'lucide-react';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { useStrings } from '@/contexts/LanguageContext';
import StatsMigration from '@/components/admin/StatsMigration';
import CollectionMigration from '@/components/admin/CollectionMigration';
import { AchievementDebugPanel } from '@/components/achievements/AchievementDebugPanel';
import { clearAllIndexedDB } from '@/utils/clearIndexedDB';

export default function AdminDebugPage() {
  const { user } = useAuth();
  const router = useRouter();
  const t = useStrings();
  const [systemStatus, setSystemStatus] = useState<{
    indexedDB: { status: 'checking' | 'ok' | 'error'; details?: string };
    firebase: { status: 'checking' | 'ok' | 'error'; details?: string };
    localStorage: { status: 'checking' | 'ok' | 'error'; details?: string };
    firebaseStorage: { status: 'checking' | 'ok' | 'error'; details?: string };
  }>({
    indexedDB: { status: 'checking' },
    firebase: { status: 'checking' },
    localStorage: { status: 'checking' },
    firebaseStorage: { status: 'checking' }
  });

  useEffect(() => {
    // Admin check is already handled by AdminGuard in the layout
    // Just check if user exists
    if (!user) {
      router.push('/');
      return;
    }

    // Log debug page load

    // Check system status
    checkSystemStatus();
  }, [user, router]);

  const checkSystemStatus = async () => {
    // Check IndexedDB
    try {
      if (!window.indexedDB) {
        throw new Error('IndexedDB not supported in this browser');
      }
      
      // Test with a simple open/close cycle
      const testRequest = window.indexedDB.open('test-db-' + Date.now(), 1);
      
      await new Promise((resolve, reject) => {
        testRequest.onsuccess = () => {
          const db = testRequest.result;
          db.close();
          // Clean up test database
          window.indexedDB.deleteDatabase(db.name);
          resolve(true);
        };
        
        testRequest.onerror = () => {
          reject(new Error(testRequest.error?.message || 'Failed to open test database'));
        };
        
        testRequest.onupgradeneeded = () => {
          // Just let it create an empty database
        };
      });
      
      // Check main database (don't specify version to avoid conflicts)
      const mainDBRequest = window.indexedDB.open('DoshiSenseiDB');
      const mainDBInfo = await new Promise<string>((resolve, reject) => {
        mainDBRequest.onsuccess = () => {
          const db = mainDBRequest.result;
          const storeNames = Array.from(db.objectStoreNames);
          const version = db.version;
          db.close();
          resolve(`v${version}, stores: ${storeNames.length > 0 ? storeNames.join(', ') : 'none'}`);
        };
        
        mainDBRequest.onerror = () => {
          const error = mainDBRequest.error;
          if (error?.name === 'VersionError') {
            reject(new Error(`Version conflict: ${error.message}. Please clear all caches.`));
          } else {
            reject(new Error(error?.message || 'Failed to open main database'));
          }
        };
        
        mainDBRequest.onblocked = () => {
          reject(new Error('Database access blocked. Close all tabs and try again.'));
        };
      });
      
      setSystemStatus(prev => ({ 
        ...prev, 
        indexedDB: { 
          status: 'ok', 
          details: `Working correctly (${mainDBInfo})` 
        } 
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('IndexedDB check error:', error);
      setSystemStatus(prev => ({ 
        ...prev, 
        indexedDB: { 
          status: 'error', 
          details: errorMsg 
        } 
      }));
    }

    // Check localStorage
    try {
      const testKey = '_test_' + Date.now();
      localStorage.setItem(testKey, 'test');
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      if (retrieved !== 'test') {
        throw new Error('localStorage read/write test failed');
      }
      
      const usage = localStorage.length;
      setSystemStatus(prev => ({ ...prev, localStorage: { status: 'ok', details: `Working correctly (${usage} items stored)` } }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setSystemStatus(prev => ({ ...prev, localStorage: { status: 'error', details: errorMsg } }));
    }

    // Check Firebase
    try {
      if (user) {
        // Try to import Firebase to ensure it's loaded
        const { db } = await import('@/lib/firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        
        // Try to read a document
        const userRef = doc(db, 'users', user.uid);
        await getDoc(userRef);
        
        setSystemStatus(prev => ({ ...prev, firebase: { status: 'ok', details: 'Connected and authenticated' } }));
      } else {
        setSystemStatus(prev => ({ ...prev, firebase: { status: 'error', details: 'No authenticated user' } }));
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setSystemStatus(prev => ({ ...prev, firebase: { status: 'error', details: errorMsg } }));
    }

    // Check Firebase Storage
    try {
      if (user) {

        const token = await user.getIdToken();
        const response = await fetch('/api/admin/test-storage', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {

            setSystemStatus(prev => ({ 
              ...prev, 
              firebaseStorage: { 
                status: 'ok', 
                details: `Working correctly (bucket: ${result.tests.bucketAccess.bucketName})` 
              } 
            }));
          } else {
            throw new Error(result.error || 'Storage test failed');
          }
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Storage test request failed');
        }
      } else {
        setSystemStatus(prev => ({ ...prev, firebaseStorage: { status: 'error', details: 'No authenticated user' } }));
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Firebase Storage check failed:', errorMsg);
      // Note: Firebase Storage is not used for media in this app (we use local IndexedDB storage)
      // So this error is not critical
      setSystemStatus(prev => ({ 
        ...prev, 
        firebaseStorage: { 
          status: 'error', 
          details: `${errorMsg} (Note: Not used for media storage - using local IndexedDB instead)` 
        } 
      }));
    }
  };

  const getStatusIcon = (status: 'checking' | 'ok' | 'error') => {
    switch (status) {
      case 'checking':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'ok':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const reloadEntitlementRules = async () => {
    if (!confirm('This will reload all entitlement rules from code defaults. This will overwrite any manual changes made in the admin dashboard. Are you sure?')) return;
    
    try {
      const token = await user?.getIdToken();
      const response = await fetch('/api/admin/reload-entitlement-rules', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to reload rules: ${response.statusText}`);
      }
      
      const result = await response.json();
      alert(`Entitlement rules reloaded successfully! ${result.rulesUpdated} rules updated.`);
      
      // Clear client-side cache
      localStorage.removeItem('entitlement_rules_cache');
      sessionStorage.removeItem('entitlement_rules_cache');
      
    } catch (error) {
      console.error('Failed to reload entitlement rules:', error);
      alert('Failed to reload entitlement rules. Check console for details.');
    }
  };

  const clearAllCaches = async () => {
    if (!confirm('This will clear all cached data including IndexedDB, localStorage, and sessionStorage. Are you sure?')) return;

    try {

      // Clear IndexedDB using our utility
      await clearAllIndexedDB();

      // Clear localStorage
      const localStorageCount = localStorage.length;
      localStorage.clear();
      console.log(`LocalStorage cleared (${localStorageCount} items removed)`);

      // Clear sessionStorage
      const sessionStorageCount = sessionStorage.length;
      sessionStorage.clear();
      console.log(`SessionStorage cleared (${sessionStorageCount} items removed)`);

      alert('All caches cleared successfully. The page will now refresh.');
      window.location.reload();
    } catch (error) {
      console.error('Error clearing caches:', error);
      alert('Error clearing some caches. Check console for details. You may need to manually clear browser data.');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <AdminLayout title="Debug Tools">
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t.admin.debug.title}</h1>
          <p className="text-muted-foreground mt-2">
            {t.admin.debug.description}
          </p>
        </div>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t.admin.debug.systemStatus.title}
              <SimpleTooltip content={t.admin.debug.systemStatus.description}>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </SimpleTooltip>
            </CardTitle>
            <CardDescription>{t.admin.debug.systemStatus.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <SimpleTooltip content={systemStatus.indexedDB.details || t.admin.debug.systemStatus.indexedDB.tooltip}>
                <div className="flex items-center justify-between p-4 border rounded-lg cursor-help">
                  <span className="font-medium">{t.admin.debug.systemStatus.indexedDB.title}</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(systemStatus.indexedDB.status)}
                    <Badge variant={systemStatus.indexedDB.status === 'ok' ? 'default' : 'destructive'}>
                      {systemStatus.indexedDB.status}
                    </Badge>
                  </div>
                </div>
              </SimpleTooltip>

              <SimpleTooltip content={systemStatus.firebase.details || t.admin.debug.systemStatus.firebase.tooltip}>
                <div className="flex items-center justify-between p-4 border rounded-lg cursor-help">
                  <span className="font-medium">{t.admin.debug.systemStatus.firebase.title}</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(systemStatus.firebase.status)}
                    <Badge variant={systemStatus.firebase.status === 'ok' ? 'default' : 'destructive'}>
                      {systemStatus.firebase.status}
                    </Badge>
                  </div>
                </div>
              </SimpleTooltip>

              <SimpleTooltip content={systemStatus.localStorage.details || t.admin.debug.systemStatus.localStorage.tooltip}>
                <div className="flex items-center justify-between p-4 border rounded-lg cursor-help">
                  <span className="font-medium">{t.admin.debug.systemStatus.localStorage.title}</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(systemStatus.localStorage.status)}
                    <Badge variant={systemStatus.localStorage.status === 'ok' ? 'default' : 'destructive'}>
                      {systemStatus.localStorage.status}
                    </Badge>
                  </div>
                </div>
              </SimpleTooltip>

              <SimpleTooltip content={systemStatus.firebaseStorage.details || 'Firebase Storage for images and files'}>
                <div className="flex items-center justify-between p-4 border rounded-lg cursor-help">
                  <span className="font-medium">Firebase Storage</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(systemStatus.firebaseStorage.status)}
                    <Badge variant={systemStatus.firebaseStorage.status === 'ok' ? 'default' : 'destructive'}>
                      {systemStatus.firebaseStorage.status}
                    </Badge>
                  </div>
                </div>
              </SimpleTooltip>
            </div>
            
            {/* Show any errors */}
            {(systemStatus.indexedDB.status === 'error' || systemStatus.firebase.status === 'error' || systemStatus.localStorage.status === 'error' || systemStatus.firebaseStorage.status === 'error') && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <h4 className="font-medium text-destructive mb-2">{t.admin.debug.errors.details}</h4>
                <ul className="text-sm space-y-1">
                  {systemStatus.indexedDB.status === 'error' && (
                    <li>• <strong>IndexedDB:</strong> {systemStatus.indexedDB.details}</li>
                  )}
                  {systemStatus.firebase.status === 'error' && (
                    <li>• <strong>Firebase:</strong> {systemStatus.firebase.details}</li>
                  )}
                  {systemStatus.localStorage.status === 'error' && (
                    <li>• <strong>LocalStorage:</strong> {systemStatus.localStorage.details}</li>
                  )}
                  {systemStatus.firebaseStorage.status === 'error' && (
                    <li>• <strong>Firebase Storage:</strong> {systemStatus.firebaseStorage.details}</li>
                  )}
                </ul>
              </div>
            )}
            
            <div className="mt-4 flex gap-2">
              <SimpleTooltip content={t.admin.debug.quickActions.refreshStatus.tooltip}>
                <Button 
                  onClick={checkSystemStatus} 
                  variant="outline" 
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t.admin.debug.quickActions.refreshStatus.title}
                </Button>
              </SimpleTooltip>
              
              <SimpleTooltip content={t.admin.debug.quickActions.clearAllCaches.tooltip}>
                <Button 
                  onClick={clearAllCaches} 
                  variant="destructive" 
                  size="sm"
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {t.admin.debug.quickActions.clearAllCaches.title}
                </Button>
              </SimpleTooltip>
              
              <SimpleTooltip content="Reload entitlement rules from code defaults. This will fix missing features like kana_study.">
                <Button 
                  onClick={reloadEntitlementRules} 
                  variant="outline" 
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Entitlement Rules
                </Button>
              </SimpleTooltip>
            </div>
          </CardContent>
        </Card>

        {/* Debug Tools Tabs */}
        <Tabs defaultValue="stats" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="stats">Stats Debug Panel</TabsTrigger>
            <TabsTrigger value="console">Console Monitor</TabsTrigger>
            <TabsTrigger value="migration">Stats Migration</TabsTrigger>
            <TabsTrigger value="collections">Collections Migration</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
          </TabsList>
          
          <TabsContent value="stats" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {t.admin.debug.statsPanel.title}
                  <SimpleTooltip content={t.admin.debug.statsPanel.description}>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </SimpleTooltip>
                </CardTitle>
                <CardDescription>
                  {t.admin.debug.statsPanel.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdminStatsDebugPanel />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="console" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {t.admin.debug.consoleMonitor.title}
                  <SimpleTooltip content={t.admin.debug.consoleMonitor.description}>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </SimpleTooltip>
                </CardTitle>
                <CardDescription>
                  {t.admin.debug.consoleMonitor.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ConsoleMonitor />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="migration" className="space-y-4">
            <StatsMigration />
          </TabsContent>
          
          <TabsContent value="collections" className="space-y-4">
            <CollectionMigration />
          </TabsContent>
          
          <TabsContent value="achievements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Achievement System Debug
                  <SimpleTooltip content="Debug and manage achievement data">
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </SimpleTooltip>
                </CardTitle>
                <CardDescription>
                  Clear achievement data and debug the achievement system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AchievementDebugPanel />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t.admin.debug.quickActions.title}
              <SimpleTooltip content={t.admin.debug.quickActions.description}>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </SimpleTooltip>
            </CardTitle>
            <CardDescription>{t.admin.debug.quickActions.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SimpleTooltip content={t.admin.debug.quickActions.logDebugInfo.tooltip}>
                <Button
                  variant="outline"
                  onClick={() => {

                    console.log('LocalStorage items:', Object.keys(localStorage));
                    console.log('SessionStorage items:', Object.keys(sessionStorage));
                    alert('Debug info logged to console');
                  }}
                >
                  {t.admin.debug.quickActions.logDebugInfo.title}
                </Button>
              </SimpleTooltip>
              
              <SimpleTooltip content={t.admin.debug.quickActions.exportSystemInfo.tooltip}>
                <Button
                  variant="outline"
                  onClick={() => {
                    const debugData = {
                      timestamp: new Date().toISOString(),
                      user: user?.email,
                      userAgent: navigator.userAgent,
                      viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight
                      },
                      storage: {
                        localStorage: Object.keys(localStorage).length,
                        sessionStorage: Object.keys(sessionStorage).length
                      }
                    };
                    const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `debug-info-${Date.now()}.json`;
                    a.click();
                  }}
                >
                  {t.admin.debug.quickActions.exportSystemInfo.title}
                </Button>
              </SimpleTooltip>
              
              <SimpleTooltip content="Run a comprehensive test of Firebase Storage">
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const token = await user?.getIdToken();
                      const response = await fetch('/api/admin/test-storage', {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${token}`
                        }
                      });
                      
                      const result = await response.json();
                      
                      if (result.success) {

                        alert(`Firebase Storage test successful!\n\nBucket: ${result.tests.bucketAccess.bucketName}\nFile uploaded: ${result.tests.fileUpload.success}\nImage test: ${result.tests.imageDownloadAndStore?.success ? 'Success' : 'Failed'}\n\nCheck console for full details.`);
                      } else {
                        console.error('Firebase Storage test failed:', result);
                        alert(`Firebase Storage test failed: ${result.error}\n\nCheck console for details.`);
                      }
                    } catch (error) {
                      console.error('Error running storage test:', error);
                      alert('Failed to run storage test. Check console for details.');
                    }
                  }}
                >
                  Test Firebase Storage
                </Button>
              </SimpleTooltip>

              <SimpleTooltip content="Test console capture with various log types">
                <Button
                  variant="outline"
                  onClick={() => {

                    console.error('This is an error message', new Error('Test error'));

                    console.log('Complex object:', {
                      user: { name: 'Test User', email: 'test@example.com' },
                      settings: { theme: 'dark', language: 'en' },
                      timestamp: new Date().toISOString()
                    });
                  }}
                >
                  Test Console Logs
                </Button>
              </SimpleTooltip>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}