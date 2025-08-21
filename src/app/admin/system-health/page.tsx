'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import SystemHealthDashboard from '@/components/admin/system-health/SystemHealthDashboard';

export default function SystemHealthPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        router.push('/');
        return;
      }

      try {
        const token = await user.getIdToken();
        const idTokenResult = await user.getIdTokenResult();
        const adminClaim = idTokenResult.claims.admin === true;
        const isAdminEmail = user.email === 'emmanuelfabiani23@gmail.com';
        
        if (adminClaim || isAdminEmail) {
          setIsAdmin(true);
        } else {
          router.push('/');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">System Health Monitor</h1>
          <p className="mt-2 text-gray-600">
            Monitor subscription health, webhook status, and data consistency
          </p>
        </div>

        <SystemHealthDashboard />
      </div>
    </div>
  );
}