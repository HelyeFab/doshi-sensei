'use client';

import { useState } from 'react';
import { useStrings } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { CheckIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';

interface ReferralLinkInputProps {
  referralCode: string;
  baseUrl?: string;
}

export function ReferralLinkInput({ referralCode, baseUrl }: ReferralLinkInputProps) {
  const strings = useStrings();
  const [copied, setCopied] = useState(false);
  
  const referralUrl = baseUrl 
    ? `${baseUrl}?ref=${referralCode}`
    : `https://doshisensei.com?ref=${referralCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      
      // Reset after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = referralUrl;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        console.error('Fallback copy failed:', e);
      }
      
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {strings.share?.referralLink?.label || 'Your Referral Link'}
        </label>
        
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={referralUrl}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCopy}
            className={`
              px-4 py-2 rounded-lg font-medium transition-all duration-200
              flex items-center gap-2
              ${copied 
                ? 'bg-green-500 text-white' 
                : 'bg-primary-600 text-white hover:bg-primary-700'
              }
            `}
          >
            {copied ? (
              <>
                <CheckIcon className="w-4 h-4" />
                {strings.share?.copied || 'Copied!'}
              </>
            ) : (
              <>
                <ClipboardDocumentIcon className="w-4 h-4" />
                {strings.share?.copy || 'Copy'}
              </>
            )}
          </motion.button>
        </div>
      </div>
      
      <div className="space-y-2">
        <h4 className="font-medium text-gray-900">
          {strings.share?.referralLink?.shareVia || 'Or share directly:'}
        </h4>
        
        <div className="grid grid-cols-2 gap-2">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
              strings.share?.templates?.twitter || 'Join me on Doshi Sensei! 🇯🇵'
            )}&url=${encodeURIComponent(referralUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            <span>🐦</span>
            Twitter
          </a>
          
          <a
            href={`https://wa.me/?text=${encodeURIComponent(
              `${strings.share?.templates?.whatsapp || 'Check out Doshi Sensei for learning Japanese!'} ${referralUrl}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
          >
            <span>💬</span>
            WhatsApp
          </a>
          
          <a
            href={`mailto:?subject=${encodeURIComponent(
              strings.share?.templates?.emailSubject || 'Learn Japanese with Doshi Sensei'
            )}&body=${encodeURIComponent(
              `${strings.share?.templates?.emailBody || 'I thought you might be interested in this Japanese learning app:'} ${referralUrl}`
            )}`}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
          >
            <span>✉️</span>
            Email
          </a>
          
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(
              strings.share?.templates?.telegram || 'Learn Japanese with Doshi Sensei!'
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-3 py-2 bg-sky-100 text-sky-700 rounded-lg hover:bg-sky-200 transition-colors"
          >
            <span>✈️</span>
            Telegram
          </a>
        </div>
      </div>
    </div>
  );
}