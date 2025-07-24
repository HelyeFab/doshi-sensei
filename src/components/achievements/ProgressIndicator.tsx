'use client';

import { motion } from 'framer-motion';

interface ProgressIndicatorProps {
  current: number;
  target: number;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  showNumbers?: boolean;
  animated?: boolean;
  className?: string;
}

export function ProgressIndicator({
  current,
  target,
  color = '#6366f1',
  size = 'md',
  showNumbers = true,
  animated = true,
  className = ''
}: ProgressIndicatorProps) {
  const percentage = Math.min((current / target) * 100, 100);
  const isComplete = current >= target;

  const sizeConfig = {
    sm: {
      container: 'w-12 h-12',
      strokeWidth: 2,
      radius: 20,
      textSize: 'text-xs',
      numberSize: 'text-xs'
    },
    md: {
      container: 'w-16 h-16',
      strokeWidth: 3,
      radius: 28,
      textSize: 'text-sm',
      numberSize: 'text-xs'
    },
    lg: {
      container: 'w-20 h-20',
      strokeWidth: 4,
      radius: 36,
      textSize: 'text-base',
      numberSize: 'text-sm'
    }
  };

  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * config.radius;
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;

  return (
    <div className={`relative ${config.container} ${className}`}>
      {/* Background Circle */}
      <svg
        className="absolute inset-0 w-full h-full -rotate-90"
        viewBox="0 0 64 64"
      >
        <circle
          cx="32"
          cy="32"
          r={config.radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.strokeWidth}
          className="text-muted/30"
        />
        
        {/* Progress Circle */}
        <motion.circle
          cx="32"
          cy="32"
          r={config.radius}
          fill="none"
          stroke={color}
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={animated ? undefined : strokeDasharray}
          className="transition-all duration-500"
          initial={animated ? { strokeDasharray: `0 ${circumference}` } : undefined}
          animate={animated ? { strokeDasharray } : undefined}
          transition={animated ? { duration: 1, ease: "easeOut" } : undefined}
        />
      </svg>

      {/* Center Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isComplete ? (
          <motion.div
            initial={animated ? { scale: 0 } : undefined}
            animate={animated ? { scale: 1 } : undefined}
            transition={animated ? { delay: 0.5, type: "spring", stiffness: 200 } : undefined}
            className="text-green-500"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </motion.div>
        ) : (
          <div className="text-center">
            <div className={`font-bold text-foreground ${config.textSize}`}>
              {Math.round(percentage)}%
            </div>
          </div>
        )}
      </div>

      {/* Numbers below (optional) */}
      {showNumbers && (
        <div className={`absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-center ${config.numberSize} text-muted-foreground`}>
          {current} / {target}
        </div>
      )}
    </div>
  );
}

interface LinearProgressIndicatorProps {
  current: number;
  target: number;
  color?: string;
  height?: 'sm' | 'md' | 'lg';
  showNumbers?: boolean;
  animated?: boolean;
  className?: string;
  label?: string;
}

export function LinearProgressIndicator({
  current,
  target,
  color = '#6366f1',
  height = 'md',
  showNumbers = true,
  animated = true,
  className = '',
  label
}: LinearProgressIndicatorProps) {
  const percentage = Math.min((current / target) * 100, 100);
  const isComplete = current >= target;

  const heightConfig = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Label and Numbers */}
      {(label || showNumbers) && (
        <div className="flex items-center justify-between mb-2">
          {label && (
            <span className="text-sm font-medium text-foreground">{label}</span>
          )}
          {showNumbers && (
            <span className="text-sm text-muted-foreground">
              {current} / {target}
            </span>
          )}
        </div>
      )}

      {/* Progress Bar */}
      <div className={`w-full bg-muted rounded-full ${heightConfig[height]} overflow-hidden`}>
        <motion.div
          className="h-full rounded-full transition-all duration-500"
          style={{ backgroundColor: color }}
          initial={animated ? { width: '0%' } : { width: `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={animated ? { duration: 1, ease: "easeOut" } : undefined}
        />
      </div>

      {/* Completion Badge */}
      {isComplete && (
        <motion.div
          initial={animated ? { opacity: 0, scale: 0 } : undefined}
          animate={animated ? { opacity: 1, scale: 1 } : undefined}
          transition={animated ? { delay: 0.5, type: "spring" } : undefined}
          className="flex items-center justify-center mt-2"
        >
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Complete
          </span>
        </motion.div>
      )}
    </div>
  );
}

interface MilestoneProgressProps {
  milestones: Array<{
    value: number;
    label: string;
    icon?: string;
  }>;
  current: number;
  color?: string;
  className?: string;
}

export function MilestoneProgress({
  milestones,
  current,
  color = '#6366f1',
  className = ''
}: MilestoneProgressProps) {
  return (
    <div className={`w-full ${className}`}>
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-4 left-0 right-0 h-1 bg-muted rounded-full">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              backgroundColor: color,
              width: `${Math.min((current / milestones[milestones.length - 1].value) * 100, 100)}%`
            }}
          />
        </div>

        {/* Milestones */}
        <div className="relative flex justify-between">
          {milestones.map((milestone, index) => {
            const isReached = current >= milestone.value;
            const isActive = current >= milestone.value;

            return (
              <div key={index} className="flex flex-col items-center">
                {/* Milestone Circle */}
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                    isReached
                      ? 'border-current bg-current text-white'
                      : 'border-muted bg-background text-muted-foreground'
                  }`}
                  style={{
                    borderColor: isReached ? color : undefined,
                    backgroundColor: isReached ? color : undefined
                  }}
                >
                  {milestone.icon ? (
                    <span className="text-sm">{milestone.icon}</span>
                  ) : (
                    <span className="text-xs font-bold">{index + 1}</span>
                  )}
                </div>

                {/* Milestone Label */}
                <div className="mt-2 text-center">
                  <div className={`text-xs font-medium ${isReached ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {milestone.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {milestone.value}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}