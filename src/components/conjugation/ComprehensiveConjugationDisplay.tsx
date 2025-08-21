'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Volume2 } from 'lucide-react';
import { JapaneseWord } from '@/types';
import { ExtendedConjugationEngine } from '@/utils/conjugation-extended';
import { getConjugationStructure } from '@/utils/conjugation-display-structure';
import { VocabularyTTSButton } from '@/components/ui/TTSButton';

interface ComprehensiveConjugationDisplayProps {
  word: JapaneseWord;
  showFurigana?: boolean;
}

export function ComprehensiveConjugationDisplay({ 
  word, 
  showFurigana = false 
}: ComprehensiveConjugationDisplayProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // Get conjugations
  const conjugations = useMemo(() => {
    return ExtendedConjugationEngine.conjugate(word);
  }, [word]);
  
  // Get the appropriate structure based on word type
  const structure = useMemo(() => {
    return getConjugationStructure(word.type);
  }, [word.type]);
  
  // Initialize expanded groups based on defaultExpanded
  React.useEffect(() => {
    const defaultExpanded = new Set<string>();
    structure.forEach((group, index) => {
      if (group.defaultExpanded) {
        defaultExpanded.add(`${group.title}-${index}`);
      }
    });
    setExpandedGroups(defaultExpanded);
  }, [structure]);
  
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };
  
  const expandAll = () => {
    const allGroups = new Set<string>();
    structure.forEach((group, index) => {
      allGroups.add(`${group.title}-${index}`);
    });
    setExpandedGroups(allGroups);
  };
  
  const collapseAll = () => {
    setExpandedGroups(new Set());
  };
  
  // Helper to add furigana-style display if needed
  const formatConjugation = (value: string | undefined, showBreakdown: boolean = false) => {
    if (!value) return null;
    
    if (showBreakdown && word.kanji && word.kana) {
      // For 買う, break it down as か[買]·う
      const kanjiChar = word.kanji.replace(/[ぁ-ん]/g, '');
      const reading = word.kana.replace(/[ぁ-ん]/g, '');
      
      // Simple breakdown - you can enhance this with actual morphological analysis
      const parts = value.split('');
      return (
        <div className="flex items-baseline gap-1">
          <span className="text-lg japanese-text font-medium">{value}</span>
          {showFurigana && (
            <span className="text-xs text-muted-foreground ml-2">
              [{parts.join('·')}]
            </span>
          )}
        </div>
      );
    }
    
    return <span className="text-lg japanese-text font-medium">{value}</span>;
  };
  
  return (
    <div className="space-y-4">
      {/* Header with word info */}
      <div className="bg-card p-4 rounded-lg border">
        <h2 className="text-2xl font-bold mb-2">
          Conjugations for {word.kanji || word.kana}
        </h2>
        <p className="text-muted-foreground">
          {word.type} • {word.meaning}
        </p>
      </div>
      
      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={expandAll}
          className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Expand All
        </button>
        <button
          onClick={collapseAll}
          className="px-3 py-1 text-sm bg-muted text-foreground rounded hover:bg-muted/80"
        >
          Collapse All
        </button>
      </div>
      
      {/* Conjugation groups */}
      <div className="space-y-3">
        {structure.map((group, groupIndex) => {
          const groupId = `${group.title}-${groupIndex}`;
          const isExpanded = expandedGroups.has(groupId);
          const isCollapsible = group.collapsible !== false;
          
          // Check if any forms in this group have values
          const hasValidForms = group.forms.some(form => {
            const value = conjugations[form.key];
            return value && value !== '' && value !== 'N/A';
          });
          
          // Skip groups with no valid forms
          if (!hasValidForms) return null;
          
          return (
            <div
              key={groupId}
              className="bg-card rounded-lg border overflow-hidden"
            >
              {/* Group header */}
              <button
                onClick={() => isCollapsible && toggleGroup(groupId)}
                className={`
                  w-full px-4 py-3 flex items-center justify-between
                  ${isCollapsible ? 'hover:bg-muted/50 cursor-pointer' : 'cursor-default'}
                  transition-colors
                `}
                disabled={!isCollapsible}
              >
                <div className="flex items-center gap-2">
                  {isCollapsible && (
                    isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                  )}
                  <h3 className="font-semibold">{group.title}</h3>
                  <span className="text-xs text-muted-foreground">
                    ({group.forms.filter(f => conjugations[f.key] && conjugations[f.key] !== 'N/A').length} forms)
                  </span>
                </div>
              </button>
              
              {/* Group content */}
              {isExpanded && (
                <div className="px-4 pb-4">
                  <div className="space-y-2">
                    {group.forms.map((form, formIndex) => {
                      const value = conjugations[form.key];
                      
                      // Skip empty or N/A forms
                      if (!value || value === '' || value === 'N/A') return null;
                      
                      return (
                        <div
                          key={`${form.key}-${formIndex}`}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground mb-1">
                              {form.subLabel && (
                                <span className="font-medium">{form.subLabel} - </span>
                              )}
                              {form.label}
                            </p>
                            {formatConjugation(value, showFurigana)}
                          </div>
                          <VocabularyTTSButton
                            word={value}
                            size="sm"
                            className="ml-4"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Statistics */}
      <div className="bg-muted/30 p-4 rounded-lg text-sm text-muted-foreground">
        <p>
          Total forms available: {Object.values(conjugations).filter(v => v && v !== '' && v !== 'N/A').length}
        </p>
      </div>
    </div>
  );
}