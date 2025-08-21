'use client';

import { useState } from 'react';

interface EditableLimitCellProps {
  value: number;
  isEditing: boolean;
  onChange: (newValue: number) => void;
  onSave: () => void;
  onCancel: () => void;
  featureName: string;
  userType: string;
  limitType: 'daily' | 'total';
}

export function EditableLimitCell({
  value,
  isEditing,
  onChange,
  onSave,
  onCancel,
  featureName,
  userType,
  limitType
}: EditableLimitCellProps) {
  const [localValue, setLocalValue] = useState(value.toString());

  if (!isEditing) {
    return null; // Parent component handles display when not editing
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numValue = parseInt(localValue);
    if (!isNaN(numValue) && numValue >= -1) {
      onChange(numValue);
      onSave();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="inline-flex items-center gap-1">
      <input
        type="number"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="w-16 px-1 py-0.5 text-sm border rounded"
        min="-1"
        autoFocus
        onClick={(e) => e.stopPropagation()}
      />
      <button
        type="submit"
        className="text-green-600 hover:text-green-700 text-sm"
        title="Save"
      >
        ✓
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setLocalValue(value.toString());
          onCancel();
        }}
        className="text-red-600 hover:text-red-700 text-sm"
        title="Cancel"
      >
        ✗
      </button>
    </form>
  );
}