'use client';

import { Switch } from '@/components/Switch';

interface SelectionActionBarProps {
  onSelectBasic?: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  showToggle?: boolean;
  toggleLabel?: string;
  toggleValue?: boolean;
  onToggleChange?: (value: boolean) => void;
  actionLabel?: string;
  actionDisabled?: boolean;
  onAction?: () => void;
  selectionCount?: number;
}

export function SelectionActionBar({
  onSelectBasic,
  onSelectAll,
  onClearSelection,
  showToggle = false,
  toggleLabel = 'Toggle',
  toggleValue = false,
  onToggleChange,
  actionLabel = 'Study',
  actionDisabled = false,
  onAction,
  selectionCount = 0,
}: SelectionActionBarProps) {
  return (
    <div className="mb-6 bg-card rounded-lg border border-border p-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Selection Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {onSelectBasic && (
            <button
              onClick={onSelectBasic}
              className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors font-medium text-sm"
            >
              Basic
            </button>
          )}
          <button
            onClick={onSelectAll}
            className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors font-medium text-sm"
          >
            Select All
          </button>
          <button
            onClick={onClearSelection}
            className="px-3 py-1.5 bg-muted text-muted-foreground rounded-lg hover:bg-muted/90 transition-colors font-medium text-sm"
          >
            Clear
          </button>
          
          {/* Toggle Switch */}
          {showToggle && onToggleChange && (
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border">
              <Switch
                id="toggle-switch"
                checked={toggleValue}
                onChange={onToggleChange}
                size="sm"
              />
              <label 
                htmlFor="toggle-switch" 
                className="text-sm text-foreground cursor-pointer select-none"
              >
                {toggleLabel}
              </label>
            </div>
          )}
        </div>

        {/* Action Button */}
        {onAction && (
          <button
            onClick={onAction}
            disabled={actionDisabled}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {actionLabel}
            {selectionCount > 0 && (
              <span className="bg-primary-foreground/20 px-2 py-0.5 rounded-full text-xs">
                {selectionCount}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}