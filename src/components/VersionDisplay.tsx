'use client';

import { APP_VERSION, getVersionString } from '@/config/version';
import { useState } from 'react';

interface VersionDisplayProps {
  showDetails?: boolean;
  className?: string;
}

export function VersionDisplay({ showDetails = false, className = '' }: VersionDisplayProps) {
  const [showFullVersion, setShowFullVersion] = useState(false);
  
  const handleClick = () => {
    if (showDetails) {
      setShowFullVersion(!showFullVersion);
    }
  };
  
  return (
    <div 
      className={`text-xs text-muted-foreground ${showDetails ? 'cursor-pointer' : ''} ${className}`}
      onClick={handleClick}
    >
      {showFullVersion ? (
        <div className="space-y-1">
          <div>Version: {getVersionString()}</div>
          <div>Released: {APP_VERSION.releaseDate}</div>
          {APP_VERSION.build !== 'dev' && (
            <div>Build: {APP_VERSION.build}</div>
          )}
        </div>
      ) : (
        <span>v{APP_VERSION.version}</span>
      )}
    </div>
  );
}