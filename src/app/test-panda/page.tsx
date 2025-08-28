'use client';

import { useState } from 'react';
import RedPandaStudyModal from '@/components/RedPandaStudyModal';

export default function TestPandaPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  const testMessages = [
    "Hey there, knowledge seeker! 🎋 Ready to level up your Japanese today?",
    "Custom message: Time for your daily dose of Japanese wisdom!",
    "The red panda has an important message: がんばって！",
    "Testing, testing... Is this panda cute enough to make you study?",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Red Panda Study Modal Test Page</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Modal Behavior:</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Click the <strong>grey/transparent area</strong> to close the modal</li>
              <li>Click the <strong>red panda animation</strong> to navigate to the review section</li>
              <li>The panda will show a hover effect when you move your cursor over it</li>
            </ul>
          </div>

          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-4">Test Controls:</h2>
            
            {/* Basic trigger */}
            <div className="space-y-4">
              <div>
                <button
                  onClick={() => {
                    setCustomMessage('');
                    setIsModalOpen(true);
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Open Modal (Random Message)
                </button>
              </div>

              {/* Custom message input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter custom message..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => setIsModalOpen(true)}
                  disabled={!customMessage}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors font-medium"
                >
                  Open with Custom Message
                </button>
              </div>

              {/* Preset messages */}
              <div>
                <p className="text-sm text-gray-600 mb-2">Quick test messages:</p>
                <div className="flex flex-wrap gap-2">
                  {testMessages.map((msg, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setCustomMessage(msg);
                        setIsModalOpen(true);
                      }}
                      className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm"
                    >
                      Message {index + 1}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Modal state indicator */}
          <div className="border-t pt-6">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isModalOpen ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600">
                Modal is currently: <strong>{isModalOpen ? 'OPEN' : 'CLOSED'}</strong>
              </span>
            </div>
          </div>

          {/* Instructions */}
          <div className="border-t pt-6 bg-yellow-50 -m-6 mt-6 p-6 rounded-b-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">📝 Developer Notes:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• The modal uses Lottie animation from <code>/public/red-panda/red-panda.json</code></li>
              <li>• Component location: <code>/src/components/RedPandaStudyModal.tsx</code></li>
              <li>• The component accepts <code>isOpen</code>, <code>onClose</code>, and optional <code>customMessage</code> props</li>
              <li>• Random motivational messages are built-in when no custom message is provided</li>
            </ul>
          </div>
        </div>
      </div>

      {/* The actual modal */}
      <RedPandaStudyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customMessage={customMessage}
      />
    </div>
  );
}