'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onLoad?: () => void;
  fill?: boolean;
  sizes?: string;
  style?: React.CSSProperties;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  quality = 85,
  placeholder = 'empty',
  blurDataURL,
  onLoad,
  fill = false,
  sizes,
  style
}: OptimizedImageProps) {
  const [isInView, setIsInView] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (priority || !imageRef.current) {
      setIsInView(true);
      return;
    }
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.01
      }
    );
    
    observer.observe(imageRef.current);
    
    return () => {
      observer.disconnect();
    };
  }, [priority]);
  
  // Generate responsive sizes if not provided
  const responsiveSizes = sizes || fill ? sizes : 
    width ? `(max-width: ${width}px) 100vw, ${width}px` : undefined;
  
  return (
    <div ref={imageRef} className={`relative ${fill ? 'w-full h-full' : ''}`} style={style}>
      {isInView ? (
        <Image
          src={src}
          alt={alt}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          className={className}
          priority={priority}
          quality={quality}
          placeholder={placeholder}
          blurDataURL={blurDataURL}
          onLoad={onLoad}
          fill={fill}
          sizes={responsiveSizes}
          loading={priority ? undefined : 'lazy'}
        />
      ) : (
        <div 
          className={`${className} bg-gray-200 dark:bg-gray-700 animate-pulse`}
          style={{
            width: fill ? '100%' : width,
            height: fill ? '100%' : height
          }}
        />
      )}
    </div>
  );
}

// Wrapper for external images that can't use Next.js Image optimization
export function ExternalImage({
  src,
  alt,
  className = '',
  width,
  height,
  onLoad,
  style
}: Omit<OptimizedImageProps, 'fill' | 'sizes' | 'priority' | 'quality' | 'placeholder' | 'blurDataURL'>) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!imageRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.01
      }
    );
    
    observer.observe(imageRef.current);
    
    return () => {
      observer.disconnect();
    };
  }, []);
  
  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };
  
  return (
    <div ref={imageRef} className="relative" style={style}>
      {isInView && (
        <>
          {!isLoaded && (
            <div 
              className={`${className} bg-gray-200 dark:bg-gray-700 animate-pulse absolute inset-0`}
              style={{ width, height }}
            />
          )}
          <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            className={`${className} ${!isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
            loading="lazy"
            onLoad={handleLoad}
          />
        </>
      )}
      {!isInView && (
        <div 
          className={`${className} bg-gray-200 dark:bg-gray-700 animate-pulse`}
          style={{ width, height }}
        />
      )}
    </div>
  );
}