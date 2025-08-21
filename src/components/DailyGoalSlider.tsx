'use client';

import { useStrings } from '@/contexts/LanguageContext';

interface DailyGoalSliderProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

export function DailyGoalSlider({ value, onChange, className = '' }: DailyGoalSliderProps) {
  const strings = useStrings();

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-primary">
          {strings.settings.dailyGoalWords}
        </label>
        <span className="text-sm font-medium text-foreground">
          {value} {strings.common?.questions || 'questions'}
        </span>
      </div>
      <div className="flex items-center space-x-3">
        <span className="text-xs text-muted-foreground">5</span>
        <input
          type="range"
          min="5"
          max="50"
          step="5"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${((value - 5) / 45) * 100}%, var(--muted) ${((value - 5) / 45) * 100}%, var(--muted) 100%)`
          }}
        />
        <span className="text-xs text-muted-foreground">50</span>
      </div>
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          background: var(--primary);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: var(--primary);
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
}