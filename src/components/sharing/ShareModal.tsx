'use client';

import { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useStrings } from '@/contexts/LanguageContext';
import { ShareMethodGrid } from './ShareMethodGrid';
import { useShare } from '@/hooks/useShare';
import { ShareMethod } from '@/types/sharing';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType?: 'app' | 'article' | 'story' | 'achievement';
  contentTitle?: string;
  contentUrl?: string;
}

export function ShareModal({
  isOpen,
  onClose,
  contentType = 'app',
  contentTitle,
  contentUrl
}: ShareModalProps) {
  const strings = useStrings();
  const { 
    shareContent, 
    referralCode, 
    shareStats, 
    isLoading,
    error,
    loadShareData 
  } = useShare();

  useEffect(() => {
    if (isOpen) {
      loadShareData();
    }
  }, [isOpen, loadShareData]);

  const handleShare = async (method: ShareMethod) => {
    const content = {
      title: contentTitle || strings.share?.defaultTitle || 'Learn Japanese with Dōshi Sensei',
      text: strings.share?.defaultText || 'Join me on Dōshi Sensei and learn Japanese together!',
      url: contentUrl || (referralCode ? `https://doshisensei.com?ref=${referralCode}` : 'https://doshisensei.com')
    };

    const result = await shareContent(content, method);
    
  };


  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    {contentType === 'app' 
                      ? (strings.share?.modalTitle || 'Share Doshi Sensei')
                      : (strings.share?.shareContent || 'Share Content')}
                  </Dialog.Title>
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>


                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* Share Methods */}
                <ShareMethodGrid 
                  onShare={handleShare}
                  isLoading={isLoading}
                />

              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}