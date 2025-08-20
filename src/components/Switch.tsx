'use client';

import { useState } from 'react';

interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  labelPosition?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  id?: string;
}

export function Switch({
  checked: controlledChecked,
  defaultChecked = false,
  onChange,
  disabled = false,
  label,
  labelPosition = 'right',
  size = 'md',
  className = '',
  id,
}: SwitchProps) {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isChecked = controlledChecked !== undefined ? controlledChecked : internalChecked;

  const handleToggle = () => {
    if (disabled) return;
    
    const newValue = !isChecked;
    if (controlledChecked === undefined) {
      setInternalChecked(newValue);
    }
    onChange?.(newValue);
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          switch: 'w-8 h-4',
          thumb: 'w-3 h-3',
          translate: 'translate-x-4',
          label: 'text-sm',
        };
      case 'lg':
        return {
          switch: 'w-14 h-7',
          thumb: 'w-6 h-6',
          translate: 'translate-x-7',
          label: 'text-base',
        };
      default: // md
        return {
          switch: 'w-11 h-6',
          thumb: 'w-5 h-5',
          translate: 'translate-x-5',
          label: 'text-sm',
        };
    }
  };

  const sizes = getSizeClasses();
  const switchId = id || `switch-${Math.random().toString(36).substr(2, 9)}`;

  const switchElement = (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      aria-label={label || 'Toggle switch'}
      id={switchId}
      disabled={disabled}
      onClick={handleToggle}
      className={`
        ${sizes.switch}
        relative inline-flex flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${isChecked 
          ? 'bg-blue-600 dark:bg-blue-500' 
          : 'bg-gray-200 dark:bg-gray-700'
        }
        ${disabled 
          ? 'opacity-50 cursor-not-allowed' 
          : 'hover:bg-opacity-80'
        }
      `}
    >
      <span
        className={`
          ${sizes.thumb}
          pointer-events-none inline-block rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out
          ${isChecked ? sizes.translate : 'translate-x-0'}
        `}
      />
    </button>
  );

  if (!label) {
    return <div className={className}>{switchElement}</div>;
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {labelPosition === 'left' && (
        <label
          htmlFor={switchId}
          className={`${sizes.label} ${disabled ? 'opacity-50' : 'cursor-pointer'} text-gray-700 dark:text-gray-300`}
        >
          {label}
        </label>
      )}
      {switchElement}
      {labelPosition === 'right' && (
        <label
          htmlFor={switchId}
          className={`${sizes.label} ${disabled ? 'opacity-50' : 'cursor-pointer'} text-gray-700 dark:text-gray-300`}
        >
          {label}
        </label>
      )}
    </div>
  );
}