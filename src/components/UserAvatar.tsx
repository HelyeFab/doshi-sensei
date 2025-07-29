'use client';

import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useStrings } from '@/contexts/LanguageContext';
import { useState } from 'react';
import VirtualCompanion from '@/components/VirtualCompanion';
import { ExternalImage } from '@/components/ui/OptimizedImage';

interface UserAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBorder?: boolean;
  clickable?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-20 h-20 text-xl',
};

export default function UserAvatar({ size = 'md', className = '', showBorder = true, clickable = true }: UserAvatarProps) {
  const { profile, profilePicture, loading } = useUserProfile();
  const { user } = useAuth();
  const strings = useStrings();
  const [isCompanionOpen, setIsCompanionOpen] = useState(false);

  // While loading, show a placeholder that matches the final size
  if (loading) {
    return (
      <div 
        className={`${sizeClasses[size]} rounded-full bg-muted animate-pulse ${className}`}
        style={showBorder ? { boxShadow: '0 0 0 2px white, 0 0 0 4px var(--primary), 0 4px 12px rgba(0,0,0,0.15)' } : {}}
      />
    );
  }

  const avatarElement = profilePicture ? (
    <ExternalImage
      src={profilePicture}
      alt={profile?.displayName || profile?.email || 'User avatar'}
      className={`${sizeClasses[size]} rounded-full object-cover ${clickable ? 'hover:opacity-90 transition-opacity' : ''} ${className}`}
      style={showBorder ? { boxShadow: '0 0 0 2px white, 0 0 0 4px var(--primary), 0 4px 12px rgba(0,0,0,0.15)' } : {}}
      width={size === 'sm' ? 32 : size === 'md' ? 48 : size === 'lg' ? 64 : 80}
      height={size === 'sm' ? 32 : size === 'md' ? 48 : size === 'lg' ? 64 : 80}
    />
  ) : (
    <div
      className={`${sizeClasses[size]} rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium ${clickable ? 'hover:opacity-90 transition-opacity' : ''} ${className}`}
      style={showBorder ? { boxShadow: '0 0 0 2px white, 0 0 0 4px var(--primary), 0 4px 12px rgba(0,0,0,0.15)' } : {}}
    >
      {profile?.displayName?.[0] || profile?.email?.[0]?.toUpperCase() || '?'}
    </div>
  );

  // Wrap in button if clickable
  if (clickable) {
    return (
      <>
        <button
          onClick={() => setIsCompanionOpen(true)}
          className="inline-block cursor-pointer"
          aria-label="Open menu"
          title={strings?.tooltips?.openVirtualCompanion || "Open menu"}
        >
          {avatarElement}
        </button>
        
        <VirtualCompanion
          isOpen={isCompanionOpen}
          onClose={() => setIsCompanionOpen(false)}
        />
      </>
    );
  }

  return avatarElement;
}