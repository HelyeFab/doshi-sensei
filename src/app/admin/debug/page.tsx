'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminStatsDebugPanel } from '@/components/admin/StatsDebugPanel';
import { StatsDebugSummary } from '@/components/debug/StatsDebugSummary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Info, HelpCircle } from 'lucide-react';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { useStrings } from '@/contexts/LanguageContext';
import StatsMigration from '@/components/admin/StatsMigration';

export default function AdminDebugPage() {
  const { user } = useAuth();
  const router = useRouter();
  const t = useStrings();
  const [systemStatus, setSystemStatus] = useState<{
    indexedDB: { status: 'checking' | 'ok' | 'error'; details?: string };
    firebase: { status: 'checking' | 'ok' | 'error'; details?: string };
    localStorage: { status: 'checking' | 'ok' | 'error'; details?: string };
  }>({
    indexedDB: { status: 'checking' },
    firebase: { status: 'checking' },
    localStorage: { status: 'checking' }
  });

  useEffect(() => {
    // Admin check is already handled by AdminGuard in the layout
    // Just check if user exists
    if (!user) {
      router.push('/');
      return;
    }

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
      
      // Check main database (using version 5 to match the actual DB version)
      const mainDBRequest = window.indexedDB.open('DoshiSenseiDB', 5);
      const mainDBInfo = await new Promise<string>((resolve, reject) => {
        mainDBRequest.onsuccess = () => {
          const db = mainDBRequest.result;
          const storeNames = Array.from(db.objectStoreNames);
          const version = db.version;
          db.close();
          resolve(`v${version}, stores: ${storeNames.length > 0 ? storeNames.join(', ') : 'none'}`);
        };
        
        mainDBRequest.onerror = () => {
          reject(new Error(mainDBRequest.error?.message || 'Failed to open main database'));
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

  const clearAllCaches = async () => {
    if (!confirm('This will clear all cached data. Are you sure?')) return;

    try {
      // Clear IndexedDB
      const databases = await window.indexedDB.databases();
      for (const db of databases) {
        if (db.name) {
          await window.indexedDB.deleteDatabase(db.name);
        }
      }

      // Clear localStorage
      localStorage.clear();

      // Clear sessionStorage
      sessionStorage.clear();

      alert('All caches cleared successfully. Please refresh the page.');
      window.location.reload();
    } catch (error) {
      console.error('Error clearing caches:', error);
      alert('Error clearing some caches. Check console for details.');
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </div>
            
            {/* Show any errors */}
            {(systemStatus.indexedDB.status === 'error' || systemStatus.firebase.status === 'error' || systemStatus.localStorage.status === 'error') && (
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
            </div>
          </CardContent>
        </Card>

        {/* Debug Tools Tabs */}
        <Tabs defaultValue="stats" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stats">Stats Debug Panel</TabsTrigger>
            <TabsTrigger value="console">Console Monitor</TabsTrigger>
            <TabsTrigger value="migration">Migration Tools</TabsTrigger>
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
                <div className="border rounded-lg p-4">
                  <StatsDebugSummary />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="migration" className="space-y-4">
            <StatsMigration />
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
                    console.log('=== Current User ===');
                    console.log('User:', user);
                    console.log('Email:', user?.email);
                    console.log('UID:', user?.uid);
                    console.log('=== Environment ===');
                    console.log('NODE_ENV:', process.env.NODE_ENV);
                    console.log('=== Storage ===');
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
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}