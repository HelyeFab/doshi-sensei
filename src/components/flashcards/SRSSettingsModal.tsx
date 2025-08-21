'use client';

import { useState } from 'react';
import { X, Info, RotateCcw } from 'lucide-react';
import { AnkiConfig, DEFAULT_ANKI_CONFIG } from '@/utils/ankiSRSImproved';

interface SRSSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AnkiConfig;
  onSave: (config: AnkiConfig) => void;
}

export function SRSSettingsModal({ isOpen, onClose, config, onSave }: SRSSettingsModalProps) {
  const [localConfig, setLocalConfig] = useState<AnkiConfig>(config);
  const [activeTab, setActiveTab] = useState<'new' | 'review' | 'lapse'>('new');

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  const handleReset = () => {
    setLocalConfig(DEFAULT_ANKI_CONFIG);
  };

  const updateConfig = (updates: Partial<AnkiConfig>) => {
    setLocalConfig({ ...localConfig, ...updates });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        
        <div className="relative bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-xl font-semibold">SRS Algorithm Settings</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab('new')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'new' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              New Cards
            </button>
            <button
              onClick={() => setActiveTab('review')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'review' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Reviews
            </button>
            <button
              onClick={() => setActiveTab('lapse')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'lapse' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Lapses
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {activeTab === 'new' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Learning Steps (minutes)
                    <Info className="inline w-4 h-4 ml-1 text-muted-foreground" />
                  </label>
                  <input
                    type="text"
                    value={localConfig.newSteps.join(' ')}
                    onChange={(e) => {
                      const steps = e.target.value.split(' ').map(s => parseInt(s)).filter(n => !isNaN(n));
                      updateConfig({ newSteps: steps.length > 0 ? steps : [1] });
                    }}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    placeholder="1 10"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Space-separated list of learning steps in minutes
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Graduating Interval (days)
                  </label>
                  <input
                    type="number"
                    value={localConfig.graduatingInterval}
                    onChange={(e) => updateConfig({ graduatingInterval: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Easy Interval (days)
                  </label>
                  <input
                    type="number"
                    value={localConfig.easyInterval}
                    onChange={(e) => updateConfig({ easyInterval: Math.max(1, parseInt(e.target.value) || 4) })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Maximum New Cards Per Day
                  </label>
                  <input
                    type="number"
                    value={localConfig.maxNewPerDay}
                    onChange={(e) => updateConfig({ maxNewPerDay: Math.max(0, parseInt(e.target.value) || 20) })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    min="0"
                  />
                </div>
              </div>
            )}

            {activeTab === 'review' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Easy Bonus
                  </label>
                  <input
                    type="number"
                    value={localConfig.easyBonus}
                    onChange={(e) => updateConfig({ easyBonus: Math.max(1, parseFloat(e.target.value) || 1.3) })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    min="1"
                    step="0.1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Multiplier applied when you press Easy
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Interval Modifier
                  </label>
                  <input
                    type="number"
                    value={localConfig.intervalModifier}
                    onChange={(e) => updateConfig({ intervalModifier: Math.max(0.1, parseFloat(e.target.value) || 1) })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    min="0.1"
                    step="0.1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Affects all review intervals (1.0 = 100%)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Hard Interval
                  </label>
                  <input
                    type="number"
                    value={localConfig.hardInterval}
                    onChange={(e) => updateConfig({ hardInterval: Math.max(0.1, parseFloat(e.target.value) || 1.2) })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    min="0.1"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Maximum Interval (days)
                  </label>
                  <input
                    type="number"
                    value={localConfig.maximumInterval}
                    onChange={(e) => updateConfig({ maximumInterval: Math.max(1, parseInt(e.target.value) || 36500) })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Maximum Reviews Per Day
                  </label>
                  <input
                    type="number"
                    value={localConfig.maxReviewsPerDay}
                    onChange={(e) => updateConfig({ maxReviewsPerDay: Math.max(0, parseInt(e.target.value) || 200) })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    min="0"
                  />
                </div>
              </div>
            )}

            {activeTab === 'lapse' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Relearning Steps (minutes)
                  </label>
                  <input
                    type="text"
                    value={localConfig.lapseSteps.join(' ')}
                    onChange={(e) => {
                      const steps = e.target.value.split(' ').map(s => parseInt(s)).filter(n => !isNaN(n));
                      updateConfig({ lapseSteps: steps.length > 0 ? steps : [10] });
                    }}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    placeholder="10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    New Interval
                  </label>
                  <input
                    type="number"
                    value={localConfig.newInterval}
                    onChange={(e) => updateConfig({ newInterval: Math.max(0, Math.min(1, parseFloat(e.target.value) || 0)) })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    min="0"
                    max="1"
                    step="0.1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    0 = reset interval, 1 = keep interval
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Minimum Interval (days)
                  </label>
                  <input
                    type="number"
                    value={localConfig.minimumInterval}
                    onChange={(e) => updateConfig({ minimumInterval: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Leech Threshold
                  </label>
                  <input
                    type="number"
                    value={localConfig.leechThreshold}
                    onChange={(e) => updateConfig({ leechThreshold: Math.max(1, parseInt(e.target.value) || 8) })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    min="1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Number of lapses before a card is marked as a leech
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-border">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Defaults
            </button>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}