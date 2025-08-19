'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { motion } from 'framer-motion';

interface MaintenanceConfig {
  enabled: boolean;
  message: string;
  estimatedTime: string;
  activatedBy?: string;
  activatedAt?: string;
}

export default function AdminMaintenancePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [maintenanceConfig, setMaintenanceConfig] = useState<MaintenanceConfig>({
    enabled: false,
    message: 'We are performing scheduled maintenance. Please check back soon.',
    estimatedTime: '30 minutes'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadMaintenanceStatus() {
      if (!user) return;

      try {
        const maintenanceDoc = await getDoc(doc(db, 'system', 'maintenance'));
        if (maintenanceDoc.exists()) {
          setMaintenanceConfig(maintenanceDoc.data() as MaintenanceConfig);
        }
      } catch (error) {
        console.error('Error loading maintenance status:', error);
      } finally {
        setLoading(false);
      }
    }

    loadMaintenanceStatus();
  }, [user]);

  const handleMaintenanceToggle = async () => {
    setSaving(true);
    try {
      const newConfig = {
        ...maintenanceConfig,
        enabled: !maintenanceConfig.enabled,
        activatedBy: user?.email || 'Unknown',
        activatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'system', 'maintenance'), newConfig);
      setMaintenanceConfig(newConfig);

      // Log the action
      await setDoc(doc(db, 'adminLogs', `maintenance_${Date.now()}`), {
        action: newConfig.enabled ? 'MAINTENANCE_ENABLED' : 'MAINTENANCE_DISABLED',
        performedBy: user?.email,
        timestamp: new Date().toISOString(),
        details: newConfig
      });

      alert(`Maintenance mode ${newConfig.enabled ? 'ENABLED' : 'DISABLED'} successfully!`);
    } catch (error) {
      console.error('Error updating maintenance mode:', error);
      alert('Failed to update maintenance mode. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfigUpdate = async () => {
    setSaving(true);
    try {
      const updatedConfig = {
        ...maintenanceConfig,
        updatedBy: user?.email || 'Unknown',
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'system', 'maintenance'), updatedConfig);
      alert('Maintenance configuration updated successfully!');
    } catch (error) {
      console.error('Error updating configuration:', error);
      alert('Failed to update configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg">Loading maintenance settings...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8">Emergency Maintenance Control</h1>

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-lg p-6 mb-6 ${
            maintenanceConfig.enabled 
              ? 'bg-red-50 border-2 border-red-400' 
              : 'bg-green-50 border-2 border-green-400'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                {maintenanceConfig.enabled ? (
                  <>
                    <span className="text-red-600">🔴</span>
                    <span className="text-red-700">Maintenance Mode ACTIVE</span>
                  </>
                ) : (
                  <>
                    <span className="text-green-600">🟢</span>
                    <span className="text-green-700">System Running Normally</span>
                  </>
                )}
              </h2>
              <p className="text-gray-600 mt-1">
                {maintenanceConfig.enabled 
                  ? 'All users are currently blocked from accessing the app'
                  : 'Users can access the app normally'}
              </p>
            </div>
            
            <button
              onClick={handleMaintenanceToggle}
              disabled={saving}
              className={`px-8 py-4 rounded-lg font-bold text-white transition-all transform hover:scale-105 ${
                maintenanceConfig.enabled
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                maintenanceConfig.enabled ? 'DISABLE Maintenance' : 'ENABLE Maintenance'
              )}
            </button>
          </div>

          {maintenanceConfig.enabled && maintenanceConfig.activatedAt && (
            <div className="bg-white/50 rounded-lg p-3">
              <p className="text-sm">
                <strong>Activated by:</strong> {maintenanceConfig.activatedBy}
              </p>
              <p className="text-sm">
                <strong>Activated at:</strong> {new Date(maintenanceConfig.activatedAt).toLocaleString()}
              </p>
            </div>
          )}
        </motion.div>

        {/* Configuration Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-md p-6 mb-6"
        >
          <h3 className="text-xl font-semibold mb-4">Maintenance Configuration</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Message to Display to Users
              </label>
              <textarea
                value={maintenanceConfig.message}
                onChange={(e) => setMaintenanceConfig({
                  ...maintenanceConfig,
                  message: e.target.value
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                placeholder="Enter the message users will see..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Estimated Downtime
              </label>
              <input
                type="text"
                value={maintenanceConfig.estimatedTime}
                onChange={(e) => setMaintenanceConfig({
                  ...maintenanceConfig,
                  estimatedTime: e.target.value
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 30 minutes, 2 hours, etc."
              />
            </div>

            <button
              onClick={handleConfigUpdate}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Update Configuration'}
            </button>
          </div>
        </motion.div>

        {/* Instructions Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-6"
        >
          <h3 className="font-semibold mb-3 text-blue-900">Alternative Shutdown Methods</h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <span className="text-blue-600 font-mono">1.</span>
              <div>
                <strong>Environment Variable (Instant):</strong>
                <code className="bg-white px-2 py-1 rounded ml-2">NEXT_PUBLIC_MAINTENANCE_MODE=true</code>
                <p className="text-gray-600 mt-1">Set in Vercel/Netlify dashboard for immediate effect without code changes</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <span className="text-blue-600 font-mono">2.</span>
              <div>
                <strong>Database Flag (This Panel):</strong>
                <p className="text-gray-600 mt-1">Best for dynamic control with custom messages</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <span className="text-blue-600 font-mono">3.</span>
              <div>
                <strong>Health Check Endpoint:</strong>
                <code className="bg-white px-2 py-1 rounded ml-2">/api/health</code>
                <p className="text-gray-600 mt-1">Monitor app status and maintenance mode</p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Warning:</strong> Enabling maintenance mode will immediately block all users except admins. 
              Make sure to communicate the maintenance window to users in advance when possible.
            </p>
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  );
}