'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Terminal, Info, AlertCircle } from 'lucide-react';
import { SimpleTooltip } from '@/components/ui/tooltip';

export default function ConsoleMonitorClient() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Admin check is already handled by AdminGuard in the layout
    if (!user) {
      router.push('/');
      return;
    }

    // Log console monitor page load
    console.log('[SEO] Console monitor page loaded', { 
      user: user.email,
      timestamp: new Date().toISOString()
    });
  }, [user, router]);

  const triggerTestLogs = () => {
    // SEO logs
    console.log('[SEO] Checking meta tags for page optimization');
    console.info('Structured data validation passed', { 
      schema: 'WebPage', 
      url: '/admin/console-monitor' 
    });
    
    // Auth logs
    console.log('[Auth] User session validated', { 
      uid: user?.uid, 
      email: user?.email 
    });
    console.warn('Permission check: admin access granted');
    
    // Stats logs
    console.log('[Stats] Analytics event tracked', { 
      event: 'console_monitor_view', 
      userId: user?.uid 
    });
    console.info('Achievement progress updated: Console Master');
    
    // API logs
    console.log('[API] Fetching console logs from backend');
    console.error('API Error: Failed to fetch historical logs', { 
      endpoint: '/api/admin/logs', 
      status: 404 
    });
    
    // UI logs
    console.debug('[UI] Component rendered: ConsoleMonitor');
    console.log('React component update: EnhancedConsoleMonitor');
    
    // Performance logs
    console.warn('[Performance] Slow render detected', { 
      component: 'LogDisplay', 
      renderTime: '250ms' 
    });
    console.info('IndexedDB cache hit for user preferences');
    
    // System logs
    console.log('[System] Firebase connection established');
    console.info('Firestore real-time listener attached');
    
    // Other logs
    console.log('Random log message without specific category');
  };

  if (!user) {
    return null;
  }

  return (
    <AdminLayout title="Console Monitor">
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Terminal className="h-8 w-8" />
            Console Monitor
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor and debug console logs organized by category. Helps track SEO, authentication, stats, API calls, and more.
          </p>
        </div>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              How Console Monitoring Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This enhanced console monitor automatically categorizes all console logs based on their content:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50">SEO</Badge>
                <span className="text-muted-foreground">Meta tags, structured data, OG tags</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-purple-50">Auth</Badge>
                <span className="text-muted-foreground">Login, permissions, sessions</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50">Stats</Badge>
                <span className="text-muted-foreground">Analytics, tracking, metrics</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-orange-50">API</Badge>
                <span className="text-muted-foreground">HTTP requests, endpoints</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-pink-50">UI</Badge>
                <span className="text-muted-foreground">React components, rendering</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-yellow-50">Performance</Badge>
                <span className="text-muted-foreground">Speed, memory, optimization</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-gray-50">System</Badge>
                <span className="text-muted-foreground">Firebase, database, network</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Other</Badge>
                <span className="text-muted-foreground">Uncategorized logs</span>
              </div>
            </div>
            
            <div className="pt-2">
              <SimpleTooltip content="Generate sample logs to see categorization in action">
                <Button onClick={triggerTestLogs} variant="outline" size="sm">
                  <Terminal className="h-4 w-4 mr-2" />
                  Trigger Test Logs
                </Button>
              </SimpleTooltip>
            </div>

            <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-900 dark:text-yellow-100">Note on Browser Console</p>
                <p className="text-yellow-800 dark:text-yellow-200 mt-1">
                  While we can't completely hide logs from the browser console (for security reasons), 
                  all logs are captured and organized here for easier debugging. The browser console 
                  will still show all logs, but this dashboard provides better filtering and categorization.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Console Monitor - READ ONLY */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Live Console Monitor (Read-Only)
            </CardTitle>
            <CardDescription>
              View and filter console logs in real-time. This is a read-only viewer for debugging purposes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground p-4 text-center">
              Console monitoring has been removed. Console logs are now stripped at build time for better performance.
            </div>
          </CardContent>
        </Card>
        
        {/* Info about proper console removal */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Removing Console Logs Safely
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">
              To remove console logs from production builds, use build-time optimization instead of modifying source code:
            </p>
            <ul className="text-sm list-disc pl-5 space-y-1">
              <li>Next.js automatically removes console logs in production builds when using the default configuration</li>
              <li>You can also use the <code className="bg-gray-100 px-1 rounded">removeConsole</code> option in next.config.js</li>
              <li>For custom removal, use webpack's TerserPlugin during the build process</li>
              <li className="font-semibold">Never modify source files directly - it can break your application!</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}