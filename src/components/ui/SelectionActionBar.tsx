'use client';

import { ReactNode } from 'react';
import { Switch } from '@/components/Switch';

interface SelectionActionBarProps {
  // Selection controls
  onSelectBasic?: () => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  
  // Toggle control
  showToggle?: boolean;
  toggleLabel?: string;
  toggleValue?: boolean;
  onToggleChange?: (value: boolean) => void;
  
  // Action button
  actionLabel?: string;
  actionDisabled?: boolean;
  onAction?: () => void;
  selectionCount?: number;
  
  // Custom presets (optional)
  customPresets?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
  
  // Additional content
  children?: ReactNode;
  
  // Control visibility
  showSelectAll?: boolean;
  showClearSelection?: boolean;
  showAction?: boolean;
}

export function SelectionActionBar({
  onSelectBasic,
  onSelectAll,
  onClearSelection,
  showToggle = true,
  toggleLabel = 'Toggle',
  toggleValue = false,
  onToggleChange,
  actionLabel = 'Action',
  actionDisabled = false,
  onAction,
  selectionCount = 0,
  customPresets = [],
  children,
  showSelectAll = true,
  showClearSelection = true,
  showAction = true,
}: SelectionActionBarProps) {
  return (
    <div className="mb-6">
      <div className="bg-card rounded-2xl shadow-lg border border-border p-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Top Row: Selection and Toggle */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-3">
            {/* Quick Selection Presets */}
            <div className="flex items-center gap-1.5">
              {onSelectBasic && (
                <button
                  onClick={onSelectBasic}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  Basic
                </button>
              )}
              
              {/* Custom presets */}
              {customPresets.map((preset, index) => (
                <button
                  key={index}
                  onClick={preset.onClick}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    preset.variant === 'primary'
                      ? 'bg-primary/10 text-primary hover:bg-primary/20'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              
              {showSelectAll && onSelectAll && (
                <button
                  onClick={onSelectAll}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                  All
                </button>
              )}
              {showClearSelection && onClearSelection && (
                <button
                  onClick={onClearSelection}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Optional Toggle */}
            {showToggle && onToggleChange && (
              <div className="flex items-center gap-2">
                <Switch
                  checked={toggleValue}
                  onChange={onToggleChange}
                  size="md"
                  label={toggleLabel}
                  labelPosition="left"
                />
              </div>
            )}
            
            {/* Additional content slot */}
            {children}
          </div>

          {/* Action Button with Counter */}
          {showAction && onAction && (
            <button
              onClick={onAction}
              disabled={actionDisabled}
              className="w-full sm:w-auto px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/80 disabled:bg-muted disabled:text-muted-foreground transition-all font-medium text-sm flex items-center justify-center gap-2 shadow-sm"
            >
              <span>{actionLabel}</span>
              {selectionCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 text-xs font-bold bg-background/90 text-foreground rounded-full">
                  {selectionCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}