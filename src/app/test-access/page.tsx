/**
 * Test Page for Unified Feature Access Hook
 * 
 * This page tests all the different usage patterns of the new unified hook
 * to ensure it works correctly with different user types and scenarios.
 */

'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFeature } from '@/hooks/useFeature';

function FeatureTest({ featureId, options = {} }: { featureId: string, options?: any }) {
  const feature = useFeature(featureId, options);
  const [testResult, setTestResult] = useState<string>('');

  const handleTest = async () => {
    const result = await feature.checkAndTrack();
    setTestResult(result ? '✅ Access granted' : '❌ Access denied');
  };

  const handleCheckOnly = async () => {
    const result = await feature.check();
    setTestResult(result ? '✅ Can access (not tracked)' : '❌ Cannot access');
  };

  const handleTrackOnly = async () => {
    await feature.track();
    setTestResult('📊 Usage tracked');
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm space-y-2">
      <h3 className="font-semibold text-lg">{featureId}</h3>
      
      <div className="text-sm space-y-1">
        <p>Status: {feature.isLoading ? '⏳ Loading...' : feature.canUse ? '✅ Can use' : '❌ Cannot use'}</p>
        <p>User Type: <span className="font-medium">{feature.userType}</span></p>
        {feature.accessReason && (
          <p>Denial Reason: <span className="text-red-600">{feature.accessReason}</span></p>
        )}
        {feature.limit !== null && feature.limit !== -1 && (
          <>
            <p>Limit: {feature.limit}</p>
            <p>Usage: {feature.usage}</p>
            <p>Remaining: {feature.remaining || 0}</p>
          </>
        )}
        {feature.resetAt && (
          <p>Resets at: {feature.resetAt.toLocaleTimeString()}</p>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleTest}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          disabled={feature.isLoading}
        >
          Check & Track
        </button>
        <button
          onClick={handleCheckOnly}
          className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
          disabled={feature.isLoading}
        >
          Check Only
        </button>
        <button
          onClick={handleTrackOnly}
          className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600"
          disabled={feature.isLoading}
        >
          Track Only
        </button>
        <button
          onClick={() => feature.refresh()}
          className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
          disabled={feature.isLoading}
        >
          Refresh
        </button>
      </div>

      {testResult && (
        <p className="text-sm font-medium mt-2">{testResult}</p>
      )}

      {feature.AccessModals && <feature.AccessModals />}
    </div>
  );
}

export default function TestAccessPage() {
  const { user, userType, signOut } = useAuth();
  const [selectedOptions, setSelectedOptions] = useState({
    showToast: true,
    showModal: false,
    trackUsage: true,
    silent: false,
    realtimeUpdates: false,
    cache: true
  });

  const testFeatures = [
    'vocabulary_search',
    'drill_practice',
    'ai_stories',
    'youtube_shadowing',
    'news_reader',
    'kanji_quest',
    'verb_conjugation',
    'study_lists'
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold mb-4">Feature Access Testing</h1>
          
          <div className="space-y-2 text-sm">
            <p>Current User: <span className="font-medium">{user?.email || 'Not logged in'}</span></p>
            <p>User Type: <span className="font-medium text-blue-600">{userType}</span></p>
            <p>User ID: <span className="font-mono text-xs">{user?.uid || 'guest'}</span></p>
          </div>

          {user && (
            <button
              onClick={() => signOut()}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Sign Out
            </button>
          )}
        </div>

        {/* Options */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Test Options</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(selectedOptions).map(([key, value]) => (
              <label key={key} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setSelectedOptions(prev => ({
                    ...prev,
                    [key]: e.target.checked
                  }))}
                  className="rounded"
                />
                <span className="text-sm">{key}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Feature Tests */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Feature Tests</h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            {testFeatures.map(featureId => (
              <FeatureTest
                key={featureId}
                featureId={featureId}
                options={selectedOptions}
              />
            ))}
          </div>
        </div>

        {/* Legacy Hook Tests */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Legacy Hook Compatibility</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">useAccess (Compatibility)</h3>
              <LegacyAccessTest />
            </div>
            
            <div>
              <h3 className="font-medium mb-2">useAccessWithModals (Compatibility)</h3>
              <LegacyModalTest />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Test legacy useAccess compatibility
function LegacyAccessTest() {
  const [result, setResult] = useState<string>('');
  
  const handleTest = async () => {
    try {
      const { useAccess } = await import('@/hooks/useAccess.compat');
      // This would need to be in a component, but for testing we'll just check the import
      setResult('✅ Legacy useAccess compatibility layer exists');
    } catch (error) {
      setResult('❌ Legacy useAccess not found');
    }
  };

  return (
    <div className="p-3 bg-gray-50 rounded">
      <button
        onClick={handleTest}
        className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
      >
        Test Legacy Import
      </button>
      {result && <p className="mt-2 text-sm">{result}</p>}
    </div>
  );
}

// Test legacy useAccessWithModals compatibility
function LegacyModalTest() {
  const [result, setResult] = useState<string>('');
  
  const handleTest = async () => {
    try {
      const { useAccessWithModals } = await import('@/hooks/useAccessWithModals');
      // This would need to be in a component, but for testing we'll just check the import
      setResult('✅ Legacy useAccessWithModals compatibility layer exists');
    } catch (error) {
      setResult('❌ Legacy useAccessWithModals not found');
    }
  };

  return (
    <div className="p-3 bg-gray-50 rounded">
      <button
        onClick={handleTest}
        className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
      >
        Test Legacy Import
      </button>
      {result && <p className="mt-2 text-sm">{result}</p>}
    </div>
  );
}