import React from 'react';

interface ArticleQualityBadgeProps {
  qualityScore?: number;
  aiValidated?: boolean;
  aiEnhanced?: boolean;
  className?: string;
}

export function ArticleQualityBadge({ 
  qualityScore, 
  aiValidated, 
  aiEnhanced,
  className = ''
}: ArticleQualityBadgeProps) {
  // Don't show badge if not validated
  if (!aiValidated) {
    return null;
  }

  // Determine badge color and label based on quality score
  const getBadgeInfo = () => {
    if (!qualityScore) return { color: 'bg-gray-100 text-gray-600', label: 'Checking...' };
    
    if (qualityScore >= 80) {
      return { 
        color: 'bg-green-100 text-green-800 border-green-200', 
        label: 'High Quality',
        icon: '✨'
      };
    } else if (qualityScore >= 60) {
      return { 
        color: 'bg-blue-100 text-blue-800 border-blue-200', 
        label: aiEnhanced ? 'Enhanced' : 'Good',
        icon: aiEnhanced ? '🔧' : '✓'
      };
    } else if (qualityScore >= 40) {
      return { 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
        label: 'Fair',
        icon: '⚠️'
      };
    } else {
      return { 
        color: 'bg-red-100 text-red-800 border-red-200', 
        label: 'Low Quality',
        icon: '⚠️'
      };
    }
  };

  const { color, label, icon } = getBadgeInfo();

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${color} ${className}`}>
      {icon && <span className="text-xs">{icon}</span>}
      <span>{label}</span>
      {qualityScore !== undefined && (
        <span className="opacity-75">({qualityScore}%)</span>
      )}
    </div>
  );
}

interface ArticleQualityIndicatorProps {
  qualityScore?: number;
  jlptLevel?: string;
  aiValidated?: boolean;
  aiEnhanced?: boolean;
  validationResults?: {
    contentStructure?: {
      hasProperIntroduction: boolean;
      hasProperBody: boolean;
      hasProperConclusion: boolean;
      isComplete: boolean;
    };
    issues?: string[];
  };
  compact?: boolean;
}

export function ArticleQualityIndicator({
  qualityScore,
  jlptLevel,
  aiValidated,
  aiEnhanced,
  validationResults,
  compact = false
}: ArticleQualityIndicatorProps) {
  if (!aiValidated) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <ArticleQualityBadge 
          qualityScore={qualityScore}
          aiValidated={aiValidated}
          aiEnhanced={aiEnhanced}
        />
        {jlptLevel && jlptLevel !== 'Unknown' && (
          <span className="text-xs text-muted-foreground">
            JLPT: {jlptLevel}
          </span>
        )}
      </div>
    );
  }

  const structure = validationResults?.contentStructure;

  return (
    <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center justify-between">
        <ArticleQualityBadge 
          qualityScore={qualityScore}
          aiValidated={aiValidated}
          aiEnhanced={aiEnhanced}
        />
        {jlptLevel && jlptLevel !== 'Unknown' && (
          <span className="text-sm font-medium text-muted-foreground">
            JLPT: {jlptLevel}
          </span>
        )}
      </div>
      
      {structure && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Structure:</span>
          <div className="flex gap-1">
            {structure.hasProperIntroduction && <span title="Introduction">📝</span>}
            {structure.hasProperBody && <span title="Body">📄</span>}
            {structure.hasProperConclusion && <span title="Conclusion">✅</span>}
          </div>
        </div>
      )}

      {validationResults?.issues && validationResults.issues.length > 0 && qualityScore && qualityScore < 60 && (
        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-1">Issues:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {validationResults.issues.slice(0, 2).map((issue, idx) => (
              <li key={idx}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}