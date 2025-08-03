'use client';

import { ShareMethod } from '@/types/sharing';
import { useStrings } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface ShareMethodGridProps {
  onShare: (method: ShareMethod) => void;
  isLoading?: boolean;
}

const shareMethodIcons: Record<ShareMethod, { iconPath: string; color: string; label: string }> = {
  native: { iconPath: '/flat-icons/ui/share/share.svg', color: 'bg-gray-100', label: 'Share' },
  twitter: { iconPath: '/flat-icons/ui/share/twitter.svg', color: 'bg-blue-100', label: 'Twitter' },
  facebook: { iconPath: '/flat-icons/ui/share/facebook.svg', color: 'bg-blue-600', label: 'Facebook' },
  whatsapp: { iconPath: '/flat-icons/ui/share/chat.svg', color: 'bg-green-100', label: 'WhatsApp' },
  telegram: { iconPath: '/flat-icons/ui/share/telegram.svg', color: 'bg-sky-100', label: 'Telegram' },
  line: { iconPath: '/flat-icons/ui/share/chat.svg', color: 'bg-green-500', label: 'LINE' },
  email: { iconPath: '/flat-icons/ui/share/mobile.svg', color: 'bg-purple-100', label: 'Email' },
  sms: { iconPath: '/flat-icons/ui/share/mobile.svg', color: 'bg-yellow-100', label: 'SMS' },
  copy: { iconPath: '/flat-icons/ui/share/share.svg', color: 'bg-gray-100', label: 'Copy Link' },
  qr: { iconPath: '/flat-icons/ui/share/scan.svg', color: 'bg-indigo-100', label: 'QR Code' },
  clipboard: { iconPath: '/flat-icons/ui/share/share.svg', color: 'bg-gray-100', label: 'Copy' },
  linkedin: { iconPath: '/flat-icons/ui/share/share.svg', color: 'bg-blue-700', label: 'LinkedIn' },
  discord: { iconPath: '/flat-icons/ui/share/discord.svg', color: 'bg-indigo-600', label: 'Discord' },
  instagram: { iconPath: '/flat-icons/ui/share/instagram.svg', color: 'bg-pink-100', label: 'Instagram' },
  snapchat: { iconPath: '/flat-icons/ui/share/snapchat.svg', color: 'bg-yellow-300', label: 'Snapchat' },
  wechat: { iconPath: '/flat-icons/ui/share/wechat.svg', color: 'bg-green-600', label: 'WeChat' }
};

export function ShareMethodGrid({ onShare, isLoading }: ShareMethodGridProps) {
  const strings = useStrings();
  
  // Determine which methods to show based on device capabilities
  const availableMethods: ShareMethod[] = ['twitter', 'facebook', 'whatsapp', 'telegram', 'discord', 'instagram'];
  
  // Add platform-specific methods
  if (typeof window !== 'undefined') {
    // Check if we're on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Add mobile-specific sharing options
      availableMethods.push('snapchat');
      
      // Regional specific apps
      if (navigator.language.startsWith('ja')) {
        availableMethods.push('line');
      }
      if (navigator.language.startsWith('zh')) {
        availableMethods.push('wechat');
      }
    }
    
    // Add copy link option at the end
    availableMethods.push('copy');
  }

  const handleMethodClick = (method: ShareMethod) => {
    if (isLoading) return;
    onShare(method);
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      {availableMethods.map((method, index) => {
        const methodInfo = shareMethodIcons[method];
        
        return (
          <motion.button
            key={method}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleMethodClick(method)}
            disabled={isLoading}
            className={`
              relative flex flex-col items-center justify-center
              p-4 rounded-xl border-2 border-gray-200
              hover:border-primary-400 transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isLoading ? 'animate-pulse' : ''}
            `}
          >
            <div className={`
              w-12 h-12 rounded-full flex items-center justify-center
              mb-2 ${methodInfo.color} p-2
            `}>
              <Image
                src={methodInfo.iconPath}
                alt={methodInfo.label}
                width={24}
                height={24}
                className="w-6 h-6"
              />
            </div>
            <span className="text-xs font-medium text-gray-700">
              {strings.share?.methods?.[method] || methodInfo.label}
            </span>
            
            {/* Show "Most Popular" badge for WhatsApp */}
            {method === 'whatsapp' && (
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                {strings.share?.popular || 'Popular'}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}