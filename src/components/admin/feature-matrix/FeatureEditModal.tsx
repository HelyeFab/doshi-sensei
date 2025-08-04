'use client';

import { useState, useEffect } from 'react';
import { Feature } from '@/lib/features/types';
import { useNotification } from '@/contexts/NotificationContext';
import { useStrings } from '@/contexts/LanguageContext';
import { auth } from '@/lib/firebase';

interface FeatureEditModalProps {
  feature: Feature | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function FeatureEditModal({ feature, isOpen, onClose, onSave }: FeatureEditModalProps) {
  const { showNotification } = useNotification();
  const strings = useStrings();
  const [editedFeature, setEditedFeature] = useState<Partial<Feature>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (feature) {
      setEditedFeature({ ...feature });
    }
  }, [feature]);

  if (!isOpen || !feature) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/admin/update-feature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'update',
          featureId: feature.id,
          data: editedFeature
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update feature');
      }

      showNotification({
        title: 'Success',
        message: `Feature "${editedFeature.name}" updated successfully`,
        type: 'success'
      });

      onSave();
      onClose();
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'Failed to update feature',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-card rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Edit Feature: {feature.name}</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium mb-1">Feature ID</label>
                <input
                  type="text"
                  value={feature.id}
                  disabled
                  className="w-full px-3 py-2 border rounded-lg bg-muted text-muted-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={editedFeature.name || ''}
                  onChange={(e) => setEditedFeature({ ...editedFeature, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={editedFeature.description || ''}
                  onChange={(e) => setEditedFeature({ ...editedFeature, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Icon</label>
                  <input
                    type="text"
                    value={editedFeature.icon || ''}
                    onChange={(e) => setEditedFeature({ ...editedFeature, icon: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-center text-2xl"
                    maxLength={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={editedFeature.category || 'learning'}
                    onChange={(e) => setEditedFeature({ ...editedFeature, category: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="learning">Learning</option>
                    <option value="games">Games</option>
                    <option value="storage">Storage</option>
                    <option value="system">System</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Access Control */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Access Control</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Limit Type</label>
                  <select
                    value={editedFeature.limitType || 'daily'}
                    onChange={(e) => setEditedFeature({ ...editedFeature, limitType: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="none">None</option>
                    <option value="daily">Daily</option>
                    <option value="total">Total</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={editedFeature.status || 'active'}
                    onChange={(e) => setEditedFeature({ ...editedFeature, status: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="active">Active</option>
                    <option value="planned">Planned</option>
                    <option value="deprecated">Deprecated</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editedFeature.requiresAuth || false}
                    onChange={(e) => setEditedFeature({ ...editedFeature, requiresAuth: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Requires Authentication</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editedFeature.requiresSubscription || false}
                    onChange={(e) => setEditedFeature({ ...editedFeature, requiresSubscription: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Requires Subscription</span>
                </label>
              </div>
            </div>

            {/* Metadata (if exists) */}
            {feature.metadata && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Metadata</h3>
                <div className="p-4 bg-muted rounded-lg">
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(feature.metadata, null, 2)}
                  </pre>
                </div>
                <p className="text-sm text-muted-foreground">
                  Note: Metadata editing requires direct database access
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border hover:bg-muted"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}