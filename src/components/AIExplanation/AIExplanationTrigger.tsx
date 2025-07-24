'use client';

import { useState, useCallback } from 'react';
import { useAccess } from '@/hooks/useAccess';
import AIExplanationModal from './AIExplanationModal';

interface AIExplanationTriggerProps {
  text: string;
  contextType?: 'word' | 'phrase' | 'sentence' | 'paragraph';
  surroundingContext?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'inline' | 'floating';
}

export default function AIExplanationTrigger({
  text,
  contextType = 'sentence',
  surroundingContext,
  className = '',
  size = 'sm',
  variant = 'icon'
}: AIExplanationTriggerProps) {
  const [showModal, setShowModal] = useState(false);
  const { checkAndTrack } = useAccess();

  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const canUse = await checkAndTrack('ai_context_explanation');
      if (canUse) {
        setShowModal(true);
      }
    } catch (error) {
      console.error('Error checking access:', error);
    }
  }, [checkAndTrack]);

  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const renderButton = () => {
    if (variant === 'icon') {
      return (
        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center justify-center p-1 rounded-full hover:bg-gray-100 transition-colors ${className}`}
          aria-label="Get AI explanation"
        >
          <img 
            src="/flat-icons/ui/robot.svg"
            alt="AI"
            className={sizeClasses[size]}
          />
        </button>
      );
    }

    if (variant === 'inline') {
      return (
        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center gap-1 text-blue-500 hover:text-blue-600 underline decoration-dotted ${className}`}
        >
          <span className="text-sm">AI</span>
        </button>
      );
    }

    if (variant === 'floating') {
      return (
        <button
          type="button"
          onClick={handleClick}
          className={`fixed bottom-20 right-4 p-3 bg-blue-500 rounded-full shadow-lg hover:bg-blue-600 transition-colors ${className}`}
        >
          <img 
            src="/flat-icons/ui/robot.svg"
            alt="AI"
            className="w-6 h-6 filter brightness-0 invert"
          />
        </button>
      );
    }

    return null;
  };

  return (
    <div style={{ display: 'contents' }}>
      {renderButton()}
      {showModal && (
        <AIExplanationModal
          text={text}
          contextType={contextType}
          surroundingContext={surroundingContext}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}