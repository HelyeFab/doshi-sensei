'use client';

import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useStrings } from '@/contexts/LanguageContext';
import { ExternalImage } from '@/components/ui/OptimizedImage';

interface UserAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBorder?: boolean;
  priority?: boolean; // Add priority prop for above-fold usage
}

const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-20 h-20 text-xl',
};

export default function UserAvatar({ size = 'md', className = '', showBorder = true, priority = false }: UserAvatarProps) {
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
    <div 
      className={`${sizeClasses[size]} rounded-full overflow-hidden ${className}`}
      style={showBorder ? { boxShadow: '0 0 0 2px white, 0 0 0 4px var(--primary), 0 4px 12px rgba(0,0,0,0.15)' } : {}}
    >
      <ExternalImage
        src={profilePicture}
        alt={profile?.displayName || profile?.email || 'User avatar'}
        className={`w-full h-full ${profilePicture.includes('.svg') || profilePicture.includes('flat-icons') ? 'object-contain p-1' : 'object-cover'}`}
        width={size === 'sm' ? 32 : size === 'md' ? 48 : size === 'lg' ? 64 : 80}
        height={size === 'sm' ? 32 : size === 'md' ? 48 : size === 'lg' ? 64 : 80}
        priority={priority}
      />
    </div>
  ) : (
    <div
      className={`${sizeClasses[size]} rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium ${className}`}
      style={showBorder ? { boxShadow: '0 0 0 2px white, 0 0 0 4px var(--primary), 0 4px 12px rgba(0,0,0,0.15)' } : {}}
    >
      {profile?.displayName?.[0] || profile?.email?.[0]?.toUpperCase() || '?'}
    </div>
  );

  return avatarElement;
}