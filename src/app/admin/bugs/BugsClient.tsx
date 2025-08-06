'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { bugTracker, BugReport } from '@/services/bugTracking';
import UserAvatar from '@/components/UserAvatar';
import InAppNotificationBell from '@/components/notifications/InAppNotificationBell';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useStrings } from '@/contexts/LanguageContext';
import Link from 'next/link';
import { 
  Bug, 
  MessageSquare, 
  Lightbulb, 
  HelpCircle,
  Download,
  RefreshCw,
  Filter,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Minus
} from 'lucide-react';

export default function BugsClient() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const strings = useStrings();
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBug, setSelectedBug] = useState<BugReport | null>(null);
  const [filter, setFilter] = useState({
    status: 'all',
    priority: 'all',
    category: 'all'
  });
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportProgress, setExportProgress] = useState('');

  // Get display name
  const displayName = profile?.displayName || user?.displayName || 'Admin';

  const handleAvatarClick = () => {
    // Redirect to account settings
    router.push('/account');
  };

  useEffect(() => {
    // Check if user is admin
    if (!user) {
      router.push('/');
      return;
    }
    
    loadBugs();
  }, [user, filter]);

  const loadBugs = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (filter.status !== 'all') filters.status = filter.status;
      if (filter.priority !== 'all') filters.priority = filter.priority;
      if (filter.category !== 'all') filters.category = filter.category;
      
      const reports = await bugTracker.getBugReports(filters);
      setBugs(reports);
    } catch (error) {
      console.error('Error loading bugs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'bug': return <Bug className="w-4 h-4" />;
      case 'feedback': return <MessageSquare className="w-4 h-4" />;
      case 'feature': return <Lightbulb className="w-4 h-4" />;
      case 'support': return <HelpCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'investigating': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'in-progress': return <ArrowRight className="w-4 h-4 text-orange-500" />;
      case 'fixed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'wont-fix': return <XCircle className="w-4 h-4 text-gray-500" />;
      case 'duplicate': return <Minus className="w-4 h-4 text-purple-500" />;
      default: return null;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <ArrowUp className="w-4 h-4 text-red-500" />;
      case 'high': return <ArrowUp className="w-4 h-4 text-orange-500" />;
      case 'medium': return <ArrowRight className="w-4 h-4 text-yellow-500" />;
      case 'low': return <ArrowDown className="w-4 h-4 text-green-500" />;
      default: return null;
    }
  };

  const handleUpdateStatus = async (bugId: string, status: BugReport['status']) => {
    try {
      await bugTracker.updateBugReport(bugId, { status });
      await loadBugs();
      if (selectedBug?.id === bugId) {
        setSelectedBug(prev => prev ? { ...prev, status } : null);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleUpdatePriority = async (bugId: string, priority: BugReport['priority']) => {
    try {
      await bugTracker.updateBugReport(bugId, { priority });
      await loadBugs();
      if (selectedBug?.id === bugId) {
        setSelectedBug(prev => prev ? { ...prev, priority } : null);
      }
    } catch (error) {
      console.error('Error updating priority:', error);
    }
  };

  const handleExportToObsidian = async () => {
    setShowExportModal(true);
    setExportProgress('Preparing export...');
    
    try {
      // Get unsynced bugs
      const unsyncedBugs = await bugTracker.getUnsyncedBugs();
      
      if (unsyncedBugs.length === 0) {
        setExportProgress('No new bugs to export!');
        return;
      }
      
      setExportProgress(`Exporting ${unsyncedBugs.length} bug reports...`);
      
      // Create markdown files
      const markdownFiles = unsyncedBugs.map(bug => ({
        filename: `${bug.id}.md`,
        content: bugTracker.exportToObsidianMarkdown(bug)
      }));
      
      // Create a zip file or download individually
      // For now, let's create a combined markdown file
      const combinedMarkdown = markdownFiles
        .map(file => `# File: ${file.filename}\n\n${file.content}\n\n---\n\n`)
        .join('');
      
      // Download the file
      const blob = new Blob([combinedMarkdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bug-reports-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setExportProgress(`Successfully exported ${unsyncedBugs.length} reports!`);
      
      // Mark as synced
      for (const bug of unsyncedBugs) {
        await bugTracker.markAsObsidianSynced(bug.id, bug.id);
      }
      
    } catch (error) {
      console.error('Error exporting to Obsidian:', error);
      setExportProgress('Export failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Back Navigation */}
      <div className="px-4 pt-6">
        <Link 
          href="/admin" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Admin Dashboard
        </Link>
      </div>

      {/* Smart Header like homepage */}
      <header className="px-4 pt-4 pb-6" role="banner">
        <div className="flex items-center gap-3">
          {/* User Avatar */}
          <button
            onClick={handleAvatarClick}
            className="block cursor-pointer"
            aria-label="Open user menu"
          >
            <UserAvatar size="md" />
          </button>
          
          {/* Title and Subtitle */}
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-foreground">
              Bug Reports & Feedback
            </h1>
            <p className="text-sm text-muted-foreground">
              {displayName}-san, manage user reports and feedback
            </p>
          </div>
          
          {/* Notification Bell */}
          {user && <InAppNotificationBell />}
        </div>
      </header>

      <div className="container mx-auto px-4">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Bug className="w-8 h-8 text-red-500" />
              <div>
                <div className="text-2xl font-bold">
                  {bugs.filter(b => b.category === 'bug').length}
                </div>
                <div className="text-sm text-muted-foreground">Bug Reports</div>
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">
                  {bugs.filter(b => b.category === 'feedback').length}
                </div>
                <div className="text-sm text-muted-foreground">Feedback</div>
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold">
                  {bugs.filter(b => b.status === 'new').length}
                </div>
                <div className="text-sm text-muted-foreground">New Items</div>
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">
                  {bugs.filter(b => b.status === 'fixed').length}
                </div>
                <div className="text-sm text-muted-foreground">Fixed</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={loadBugs}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          
          <button
            onClick={handleExportToObsidian}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export to Obsidian
          </button>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Filters</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={filter.status}
              onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border border-border rounded-lg bg-background"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="investigating">Investigating</option>
              <option value="in-progress">In Progress</option>
              <option value="fixed">Fixed</option>
              <option value="wont-fix">Won't Fix</option>
              <option value="duplicate">Duplicate</option>
            </select>
            
            <select
              value={filter.priority}
              onChange={(e) => setFilter(prev => ({ ...prev, priority: e.target.value }))}
              className="px-3 py-2 border border-border rounded-lg bg-background"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            
            <select
              value={filter.category}
              onChange={(e) => setFilter(prev => ({ ...prev, category: e.target.value }))}
              className="px-3 py-2 border border-border rounded-lg bg-background"
            >
              <option value="all">All Categories</option>
              <option value="bug">Bugs</option>
              <option value="feedback">Feedback</option>
              <option value="feature">Features</option>
              <option value="support">Support</option>
            </select>
          </div>
        </div>

        {/* Bug List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading bug reports...</p>
            </div>
          ) : bugs.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-lg">
              <Bug className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No bug reports found</p>
            </div>
          ) : (
            bugs.map(bug => (
              <div
                key={bug.id}
                className="bg-card border border-border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedBug(bug)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getCategoryIcon(bug.category)}
                      <h3 className="font-medium text-foreground">{bug.title}</h3>
                      {getStatusIcon(bug.status)}
                      {getPriorityIcon(bug.priority)}
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {bug.description}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{bug.userName}</span>
                      <span>{bug.timestamp.toDate().toLocaleDateString()}</span>
                      <span className="capitalize">{bug.status}</span>
                      <span className="capitalize">{bug.priority}</span>
                    </div>
                  </div>
                  
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bug Detail Modal */}
      {selectedBug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xl font-bold">{selectedBug.title}</h2>
              <button
                onClick={() => setSelectedBug(null)}
                className="p-1 rounded hover:bg-muted"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{selectedBug.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <select
                    value={selectedBug.status}
                    onChange={(e) => handleUpdateStatus(selectedBug.id, e.target.value as BugReport['status'])}
                    className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
                  >
                    <option value="new">New</option>
                    <option value="investigating">Investigating</option>
                    <option value="in-progress">In Progress</option>
                    <option value="fixed">Fixed</option>
                    <option value="wont-fix">Won't Fix</option>
                    <option value="duplicate">Duplicate</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <select
                    value={selectedBug.priority}
                    onChange={(e) => handleUpdatePriority(selectedBug.id, e.target.value as BugReport['priority'])}
                    className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Reporter</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedBug.userName} ({selectedBug.userEmail})
                </p>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Technical Details</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>URL:</strong> {selectedBug.url}</p>
                  <p><strong>Date:</strong> {selectedBug.timestamp.toDate().toLocaleString()}</p>
                  <p className="truncate"><strong>User Agent:</strong> {selectedBug.userAgent}</p>
                </div>
              </div>
              
              <button
                onClick={() => {
                  const markdown = bugTracker.exportToObsidianMarkdown(selectedBug);
                  const blob = new Blob([markdown], { type: 'text/markdown' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${selectedBug.id}.md`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Export as Markdown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Export to Obsidian</h2>
            <p className="text-muted-foreground mb-4">{exportProgress}</p>
            <button
              onClick={() => setShowExportModal(false)}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}