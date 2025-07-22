'use client';

import { useState } from 'react';
import SlideUpModal from './SlideUpModal';

/**
 * Example usage of SlideUpModal component
 * 
 * Basic usage:
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 * 
 * <SlideUpModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="My Modal"
 * >
 *   <p>Your content here</p>
 * </SlideUpModal>
 * ```
 */
export function SlideUpModalExample() {
  const [basicModal, setBasicModal] = useState(false);
  const [fullModal, setFullModal] = useState(false);
  const [autoHeightModal, setAutoHeightModal] = useState(false);
  const [gameModal, setGameModal] = useState(false);

  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold mb-4">SlideUpModal Examples</h2>

      {/* Basic Modal */}
      <button
        onClick={() => setBasicModal(true)}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
      >
        Open Basic Modal
      </button>
      <SlideUpModal
        isOpen={basicModal}
        onClose={() => setBasicModal(false)}
        title="Basic Modal"
        height="70%"
      >
        <div className="space-y-4">
          <p>This is a basic modal with default settings.</p>
          <p>It slides up from the bottom and can be closed by:</p>
          <ul className="list-disc pl-6">
            <li>Clicking the X button</li>
            <li>Clicking outside the modal</li>
            <li>Swiping down on mobile (from handle or header)</li>
          </ul>
        </div>
      </SlideUpModal>

      {/* Full Height Modal */}
      <button
        onClick={() => setFullModal(true)}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
      >
        Open Full Height Modal
      </button>
      <SlideUpModal
        isOpen={fullModal}
        onClose={() => setFullModal(false)}
        title="Full Height Modal"
        height="full"
      >
        <div className="space-y-4">
          <p>This modal takes up the full height of the screen.</p>
          <p>Perfect for immersive experiences like games.</p>
        </div>
      </SlideUpModal>

      {/* Auto Height Modal */}
      <button
        onClick={() => setAutoHeightModal(true)}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
      >
        Open Auto Height Modal
      </button>
      <SlideUpModal
        isOpen={autoHeightModal}
        onClose={() => setAutoHeightModal(false)}
        title="Auto Height Modal"
        height="auto"
      >
        <div className="space-y-4">
          <p>This modal adjusts its height based on content.</p>
          <p>Great for forms or variable content.</p>
        </div>
      </SlideUpModal>

      {/* Game-like Modal */}
      <button
        onClick={() => setGameModal(true)}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
      >
        Open Game Modal
      </button>
      <SlideUpModal
        isOpen={gameModal}
        onClose={() => setGameModal(false)}
        height="90%"
        showHandle={false}
        closeOnOutsideClick={false}
        className="bg-gradient-to-b from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20"
      >
        <div className="h-full flex flex-col">
          <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold">Kanji Quest</h2>
            <button
              onClick={() => setGameModal(false)}
              className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xl">Game content would go here</p>
          </div>
        </div>
      </SlideUpModal>

      {/* Premium Upgrade Modal Example */}
      <button
        onClick={() => {/* Would open premium modal */}}
        className="px-4 py-2 bg-orange-500 text-white rounded-lg"
      >
        Premium Upgrade Example (not implemented)
      </button>
    </div>
  );
}