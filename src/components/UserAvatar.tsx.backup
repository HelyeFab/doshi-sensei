'use client';

import { useUserProfile } from '@/hooks/useUserProfile';

interface UserAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBorder?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-20 h-20 text-xl',
};

export default function UserAvatar({ size = 'md', className = '', showBorder = true }: UserAvatarProps) {
  const { profile, profilePicture, loading } = useUserProfile();

  // While loading, show a placeholder that matches the final size
  if (loading) {
    return (
      <div 
        className={`${sizeClasses[size]} rounded-full bg-muted animate-pulse ${className}`}
        style={showBorder ? { boxShadow: '0 0 0 2px white, 0 0 0 4px var(--primary), 0 4px 12px rgba(0,0,0,0.15)' } : {}}
      />
    );
  }

  // If we have a profile picture (custom avatar or Google photo), show it
  if (profilePicture) {
    return (
      <img
        src={profilePicture}
        alt={profile?.displayName || profile?.email || 'User avatar'}
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
        style={showBorder ? { boxShadow: '0 0 0 2px white, 0 0 0 4px var(--primary), 0 4px 12px rgba(0,0,0,0.15)' } : {}}
      />
    );
  }

  // Fallback to initials
  const initials = profile?.displayName?.[0] || profile?.email?.[0]?.toUpperCase() || '?';
  
  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium ${className}`}
      style={showBorder ? { boxShadow: '0 0 0 2px white, 0 0 0 4px var(--primary), 0 4px 12px rgba(0,0,0,0.15)' } : {}}
    >
      {initials}
    </div>
  );
}