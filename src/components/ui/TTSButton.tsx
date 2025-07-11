/**
 * Reusable TTS Button component with caching support
 * Can be used throughout the app for consistent TTS experience
 */

import React from 'react';
import { useTTS, TTSOptions } from '@/hooks/useTTS';
import { useStrings } from '@/hooks/useLanguage';

interface TTSButtonProps {
  text: string;
  reading?: string; // For kanji/vocabulary with specific readings
  options?: TTSOptions;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal' | 'pill';
  className?: string;
  disabled?: boolean;
  showText?: boolean;
  tooltip?: string;
  children?: React.ReactNode;
}

export function TTSButton({
  text,
  reading,
  options = {},
  size = 'md',
  variant = 'default',
  className = '',
  disabled = false,
  showText = false,
  tooltip,
  children
}: TTSButtonProps) {
  const strings = useStrings();
  const { state, speak } = useTTS();

  const handleClick = async () => {
    if (disabled || state.isLoading) return;

    // Use reading if provided (for kanji), otherwise use text
    const textToSpeak = reading || text;
    await speak(textToSpeak, options);
  };

  // Size classes
  const sizeClasses = {
    sm: 'p-1.5 w-6 h-6',
    md: 'p-2 w-8 h-8',
    lg: 'p-3 w-10 h-10'
  };

  // Variant classes
  const variantClasses = {
    default: 'hover:bg-purple-500/20 text-purple-600 border border-purple-200 dark:border-purple-800',
    minimal: 'hover:bg-muted text-muted-foreground',
    pill: 'bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-full dark:bg-purple-900 dark:hover:bg-purple-800 dark:text-purple-300'
  };

  // Icon size based on button size
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const buttonClasses = `
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${className}
    inline-flex items-center justify-center
    rounded-lg transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
    focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
    ${state.isLoading ? 'animate-pulse' : ''}
    ${state.isPlaying ? 'bg-purple-500/30' : ''}
  `.trim();

  // Loading spinner
  const LoadingIcon = () => (
    <svg
      className={`${iconSizes[size]} animate-spin`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  // Speaker icon
  const SpeakerIcon = () => (
    <svg
      className={iconSizes[size]}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {state.isPlaying ? (
        // Playing animation
        <>
          <path d="M3 9v6h4l5 5V4L7 9H3z" />
          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
          <path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
        </>
      ) : (
        // Static speaker
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
      )}
    </svg>
  );

  const buttonContent = (
    <>
      {state.isLoading ? <LoadingIcon /> : <SpeakerIcon />}
      {showText && (
        <span className="ml-2 text-sm">
          {state.isLoading ? strings.loading.general : state.isPlaying ? 'Playing...' : 'Play'}
        </span>
      )}
      {children}
    </>
  );

  // Generate tooltip text
  const tooltipText = tooltip || `${strings.tooltips.playPronunciation}: ${reading || text}`;

  return (
    <button
      onClick={handleClick}
      disabled={disabled || state.isLoading}
      className={buttonClasses}
      title={tooltipText}
      aria-label={tooltipText}
    >
      {buttonContent}
    </button>
  );
}

// Specialized TTS buttons for different contexts

interface VocabularyTTSButtonProps extends Omit<TTSButtonProps, 'options' | 'text'> {
  word: string | { kanji?: string; kana?: string; word?: string };
  kana?: string;
  voice?: 'male' | 'female';
  speed?: number;
}

export function VocabularyTTSButton({
  word,
  kana,
  voice = 'male',
  speed = 1.0,
  ...props
}: VocabularyTTSButtonProps) {
  // Handle both string and object word types
  let textToSpeak: string;
  let reading: string | undefined;
  
  if (typeof word === 'string') {
    textToSpeak = word;
    reading = kana;
  } else {
    // If word is an object, prioritize kanji, then word field, then kana
    textToSpeak = word.kanji || word.word || word.kana || '';
    reading = word.kana || kana;
  }
  
  return (
    <TTSButton
      text={textToSpeak}
      reading={reading}
      options={{ voice, speed, context: 'vocabulary' }}
      {...props}
    />
  );
}

interface KanjiTTSButtonProps extends Omit<TTSButtonProps, 'options' | 'text'> {
  kanji: string;
  reading?: string;
  readingType?: 'kun' | 'on';
  voice?: 'male' | 'female';
  speed?: number;
}

export function KanjiTTSButton({
  kanji,
  reading,
  readingType = 'kun',
  voice = 'male',
  speed = 1.0,
  ...props
}: KanjiTTSButtonProps) {
  return (
    <TTSButton
      text={kanji}
      reading={reading}
      options={{
        voice,
        speed,
        context: `kanji-${readingType}-reading`
      }}
      {...props}
    />
  );
}

interface GameTTSButtonProps extends Omit<TTSButtonProps, 'options'> {
  gameType: string;
  voice?: 'male' | 'female';
  speed?: number;
}

export function GameTTSButton({
  gameType,
  voice = 'male',
  speed = 1.0,
  ...props
}: GameTTSButtonProps) {
  return (
    <TTSButton
      options={{
        voice,
        speed,
        context: `game-${gameType}`
      }}
      {...props}
    />
  );
}

export default TTSButton;
