'use client';

import React from 'react';
import { UpgradeSlideUpModal } from './UpgradeSlideUpModal';

interface UpgradePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  feature?: string;
}

/**
 * @deprecated Use UpgradeSlideUpModal directly instead
 * This component now wraps UpgradeSlideUpModal for backward compatibility
 */
export function UpgradePromptModal(props: UpgradePromptModalProps) {
  return <UpgradeSlideUpModal {...props} />;
}
