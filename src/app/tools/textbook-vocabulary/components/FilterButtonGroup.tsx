'use client';

import { motion } from 'framer-motion';

interface FilterButtonGroupProps {
  label: string;
  value: string | null;
  options: readonly string[] | string[];
  onSelect: (value: string | null) => void;
  capitalize?: boolean;
  className?: string;
}

export function FilterButtonGroup({
  label,
  value,
  options,
  onSelect,
  capitalize = false,
  className = ''
}: FilterButtonGroupProps) {
  return (
    <div className={className}>
      <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>
      <div className="flex gap-2 flex-wrap">
        {/* All button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect(null)}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            value === null
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All
        </motion.button>
        
        {/* Option buttons */}
        {options.map((option) => (
          <motion.button
            key={option}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(option)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              value === option
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } ${capitalize ? 'capitalize' : ''}`}
          >
            {option}
          </motion.button>
        ))}
      </div>
    </div>
  );
}