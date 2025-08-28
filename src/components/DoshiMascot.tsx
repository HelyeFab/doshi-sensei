'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';

// Dynamically import Lottie to avoid SSR issues
const Lottie = dynamic(() => import('lottie-react'), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center">
      <Image
        src="/doshi.png"
        alt="Doshi Sensei"
        width={200}
        height={200}
        className="opacity-50"
      />
    </div>
  )
});

interface DoshiMascotProps {
  variant?: 'static' | 'animated' | 'auto';
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  className?: string;
  alt?: string;
  priority?: boolean;
  onClick?: () => void;
  animationSpeed?: number;
  loop?: boolean;
}

const sizeMap = {
  small: 64,
  medium: 120,
  large: 200,
  xlarge: 300,
};

export default function DoshiMascot({
  variant = 'auto',
  size = 'medium',
  className = '',
  alt = 'Doshi Sensei',
  priority = false,
  onClick,
  animationSpeed = 1,
  loop = true
}: DoshiMascotProps) {
  const [animationData, setAnimationData] = useState<any>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [loadError, setLoadError] = useState(false);
  
  const dimension = sizeMap[size];

  // Determine whether to use animation
  useEffect(() => {
    if (variant === 'static') {
      setShouldAnimate(false);
    } else if (variant === 'animated') {
      setShouldAnimate(true);
    } else {
      // Auto mode: use animation for larger sizes and on capable devices
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const isLargeEnough = size === 'large' || size === 'xlarge';
      setShouldAnimate(!prefersReducedMotion && isLargeEnough);
    }
  }, [variant, size]);

  // Load animation data if needed
  useEffect(() => {
    if (shouldAnimate && !animationData && !loadError) {
      fetch('/red-panda/red-panda.json')
        .then(response => {
          if (!response.ok) throw new Error('Failed to load animation');
          return response.json();
        })
        .then(data => setAnimationData(data))
        .catch(error => {
          console.error('Failed to load red panda animation:', error);
          setLoadError(true);
          setShouldAnimate(false);
        });
    }
  }, [shouldAnimate, animationData, loadError]);

  // Common wrapper props
  const wrapperProps = {
    className: `inline-block ${className}`,
    onClick,
    style: { 
      cursor: onClick ? 'pointer' : undefined,
      width: dimension,
      height: dimension 
    },
    role: onClick ? 'button' : undefined,
    tabIndex: onClick ? 0 : undefined,
    onKeyDown: onClick ? (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    } : undefined,
  };

  // Render animated version
  if (shouldAnimate && animationData) {
    return (
      <div {...wrapperProps}>
        <Lottie
          animationData={animationData}
          loop={loop}
          autoplay={true}
          style={{ width: '100%', height: '100%' }}
          rendererSettings={{
            preserveAspectRatio: 'xMidYMid meet'
          }}
          speed={animationSpeed}
        />
      </div>
    );
  }

  // Render static version
  return (
    <div {...wrapperProps}>
      <Image
        src="/doshi.png"
        alt={alt}
        width={dimension}
        height={dimension}
        priority={priority}
        className="w-full h-full object-contain"
      />
    </div>
  );
}

// Export a memoized version for performance
export { DoshiMascot };