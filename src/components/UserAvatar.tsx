'use client';

import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useStrings } from '@/contexts/LanguageContext';
import Link from 'next/link'
import { SmartNavigationLink } from '@/components/navigation/SmartNavigationLink';

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
    <img
      src={profilePicture}
      alt={profile?.displayName || profile?.email || 'User avatar'}
      className={`${sizeClasses[size]} rounded-full object-cover ${clickable ? 'hover:opacity-90 transition-opacity' : ''} ${className}`}
      style={showBorder ? { boxShadow: '0 0 0 2px white, 0 0 0 4px var(--primary), 0 4px 12px rgba(0,0,0,0.15)' } : {}}
    />
  ) : (
    <div
      className={`${sizeClasses[size]} rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium ${clickable ? 'hover:opacity-90 transition-opacity' : ''} ${className}`}
      style={showBorder ? { boxShadow: '0 0 0 2px white, 0 0 0 4px var(--primary), 0 4px 12px rgba(0,0,0,0.15)' } : {}}
    >
      {profile?.displayName?.[0] || profile?.email?.[0]?.toUpperCase() || '?'}
    </div>
  );

  // Wrap in Link if clickable
  if (clickable) {
    return (
      <SmartNavigationLink href={user ? "/account" : "/login"} 
        className="inline-block cursor-pointer"
        aria-label={user ? "Go to account page" : "Login or sign up"}
       title={strings?.account?.viewProfile || "View Profile"}>
        {avatarElement}
      </SmartNavigationLink>
    );
  }

  return avatarElement;
}