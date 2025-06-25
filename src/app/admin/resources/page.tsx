'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { ResourceListItem, ResourceStats, RESOURCE_CATEGORIES } from '@/types/resources';
import { getAllResourcePosts, deleteResourcePost, getResourceStats } from '@/utils/resources';
import { formatDistanceToNow } from 'date-fns';

export default function AdminResourcesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  
  const [resources, setResources] = useState<ResourceListItem[]>([]);
  const [stats, setStats] = useState<ResourceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'scheduled'>('all');
  const [selectedResources, setSelectedResources] = useState<string[]>([]);

  // Check admin access
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, adminLoading, router]);

  // Load resources and stats
  useEffect(() => {
    if (isAdmin) {
      loadResourcesData();
    }
  }, [isAdmin, statusFilter]);

  const loadResourcesData = async () => {
    try {
      setLoading(true);
      const filters = statusFilter !== 'all' ? { status: statusFilter as any } : {};
      const [resourcesData, statsData] = await Promise.all([
        getAllResourcePosts(filters),
        getResourceStats()
      ]);
      
      setResources(resourcesData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading resources data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteResourcePost(id);
      await loadResourcesData(); // Refresh the list
    } catch (error) {
      console.error('Error deleting resource:', error);
      alert('Failed to delete resource. Please try again.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedResources.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedResources.length} resources? This action cannot be undone.`)) {
      return;
    }

    try {
      await Promise.all(selectedResources.map(id => deleteResourcePost(id)));
      setSelectedResources([]);
      await loadResourcesData();
    } catch (error) {
      console.error('Error bulk deleting resources:', error);
      alert('Failed to delete some resources. Please try again.');
    }
  };

  const toggleResourceSelection = (id: string) => {
    setSelectedResources(prev => 
      prev.includes(id) 
        ? prev.filter(resourceId => resourceId !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedResources.length === filteredResources.length) {
      setSelectedResources([]);
    } else {
      setSelectedResources(filteredResources.map(resource => resource.id));
    }
  };

  // Filter resources based on search query
  const filteredResources = resources.filter(resource => {
    const matchesSearch = searchQuery === '' || 
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      published: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
      scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (adminLoading || !isAdmin) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Resources Management</h1>
          <p className="text-muted-foreground mt-1">Create and manage blog posts and resources</p>
        </div>
        <button
          onClick={() => router.push('/admin/resources/new')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          + New Resource
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="text-2xl font-bold text-primary">{stats.totalPosts}</div>
            <div className="text-sm text-muted-foreground">Total Posts</div>
          </div>
          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="text-2xl font-bold text-green-600">{stats.publishedPosts}</div>
            <div className="text-sm text-muted-foreground">Published</div>
          </div>
          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="text-2xl font-bold text-gray-600">{stats.draftPosts}</div>
            <div className="text-sm text-muted-foreground">Drafts</div>
          </div>
          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="text-2xl font-bold text-secondary">{stats.totalViews.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total Views</div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-card rounded-lg p-6 border border-border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedResources.length > 0 && (
          <div className="mt-4 flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {selectedResources.length} resource{selectedResources.length !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1 bg-destructive text-destructive-foreground rounded text-sm hover:bg-destructive/90"
            >
              Delete Selected
            </button>
            <button
              onClick={() => setSelectedResources([])}
              className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm hover:bg-secondary/90"
            >
              Clear Selection
            </button>
          </div>
        )}
      </div>

      {/* Resources Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading resources...</div>
        ) : filteredResources.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchQuery ? 'No resources found matching your search.' : 'No resources found. Create your first resource!'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4">
                    <input
                      type="checkbox"
                      checked={selectedResources.length === filteredResources.length && filteredResources.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="text-left p-4 font-medium">Title</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Category</th>
                  <th className="text-left p-4 font-medium">Views</th>
                  <th className="text-left p-4 font-medium">Updated</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResources.map((resource) => (
                  <tr key={resource.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedResources.includes(resource.id)}
                        onChange={() => toggleResourceSelection(resource.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-medium text-foreground">{resource.title}</div>
                          {resource.featured && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                              Featured
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">{getStatusBadge(resource.status)}</td>
                    <td className="p-4 text-muted-foreground">{resource.category || 'Uncategorized'}</td>
                    <td className="p-4 text-muted-foreground">{resource.views.toLocaleString()}</td>
                    <td className="p-4 text-muted-foreground">
                      {formatDistanceToNow(resource.updatedAt, { addSuffix: true })}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/admin/resources/${resource.id}/edit`)}
                          className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => window.open(`/resources/${resource.id}`, '_blank')}
                          className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteResource(resource.id)}
                          className="px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}