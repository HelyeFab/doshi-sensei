'use client';

import { useState } from 'react';

export default function TestSimpleAI() {
  const [showComponent, setShowComponent] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold mb-8">Simple AI Test</h1>
      
      <div className="space-y-4">
        <div className="bg-white p-4 rounded shadow">
          <p className="mb-4">Click the button below to show the AI component:</p>
          <button
            onClick={() => setShowComponent(!showComponent)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {showComponent ? 'Hide' : 'Show'} AI Component
          </button>
        </div>

        {showComponent && (
          <div className="bg-white p-4 rounded shadow">
            <p className="mb-2">AI component would go here</p>
            <p className="text-sm text-gray-600">If you see this without errors, the issue is in the AI components</p>
          </div>
        )}
      </div>
    </div>
  );
}