'use client';

import { useState } from 'react';
import Image from 'next/image';

interface PageHelpIconProps {
  title: string;
  description: string;
  tips?: string[];
}

export function PageHelpIcon({ title, description, tips }: PageHelpIconProps) {
  const [showModal, setShowModal] = useState(false);

  if (!showModal) {
    return (
      <button
        onClick={() => setShowModal(true)}
        className="ml-2 inline-flex items-center justify-center w-6 h-6 hover:opacity-80 transition-opacity"
        aria-label="Page help"
      >
        <Image
          src="/flat-icons/4341021-education/png/006-whistle.png"
          alt="Help"
          width={24}
          height={24}
          className="w-full h-full"
        />
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="ml-2 inline-flex items-center justify-center w-6 h-6 hover:opacity-80 transition-opacity"
        aria-label="Page help"
      >
        <Image
          src="/flat-icons/4341021-education/png/006-whistle.png"
          alt="Help"
          width={24}
          height={24}
          className="w-full h-full"
        />
      </button>

      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-card-foreground">
              {title}
            </h3>
            <button
              onClick={() => setShowModal(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-4">
            <p className="text-foreground">{description}</p>
            
            {tips && tips.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">Tips:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {tips.map((tip, index) => (
                    <li key={index} className="text-muted-foreground text-sm">
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="pt-4">
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}