'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Volume2, Type, Brain, Shuffle, Hash, BookOpen, Zap, Info, RotateCcw, HelpCircle } from 'lucide-react';
import { AnkiConfig, DEFAULT_ANKI_CONFIG } from '@/utils/ankiSRSImproved';

interface CardSettings {
  dailyNewCards: number;
  dailyReviewCards: number;
  cardOrder: 'sequential' | 'random' | 'srs';
  flipDirection: 'japanese-english' | 'english-japanese' | 'mixed';
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  autoPlayAudio: boolean;
  showFurigana: boolean;
  showCardType: boolean;
  focusMode: 'standard' | 'weakest' | 'oldest';
}

interface CardSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CardSettings;
  onUpdateSettings: (settings: Partial<CardSettings>) => void;
  srsConfig: AnkiConfig;
  onUpdateSRSConfig: (config: AnkiConfig) => void;
}

// Tooltip component that works on both mobile and desktop
interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

function Tooltip({ text, children }: TooltipProps) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (show && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let top = triggerRect.top - tooltipRect.height - 8;
      let left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
      
      // Check if tooltip goes off screen and adjust
      if (top < 0) {
        // Show below if no room above
        top = triggerRect.bottom + 8;
      }
      
      if (left < 8) {
        left = 8;
      } else if (left + tooltipRect.width > viewportWidth - 8) {
        left = viewportWidth - tooltipRect.width - 8;
      }
      
      setPosition({ top, left });
    }
  }, [show]);
  
  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onTouchStart={(e) => {
          e.preventDefault();
          setShow(!show);
        }}
        className="cursor-help inline-block"
      >
        {children}
      </div>
      
      {show && typeof window !== 'undefined' && createPortal(
        <>
          {/* Backdrop for mobile - tap anywhere to close */}
          <div 
            className="fixed inset-0 z-[9998] md:hidden" 
            onTouchStart={() => setShow(false)}
          />
          
          {/* Tooltip */}
          <div 
            ref={tooltipRef}
            className="fixed z-[9999] px-3 py-2 text-sm bg-background text-foreground border border-border rounded-lg shadow-lg
              w-[280px] max-w-[calc(100vw-16px)] backdrop-blur-none"
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              backgroundColor: 'var(--background)',
            }}
          >
            <div className="text-xs leading-relaxed break-words">{text}</div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}

export function CardSettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  srsConfig,
  onUpdateSRSConfig
}: CardSettingsModalProps) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [localSRSConfig, setLocalSRSConfig] = useState(srsConfig || DEFAULT_ANKI_CONFIG);
  const [activeTab, setActiveTab] = useState<'card' | 'srs'>('card');
  
  // Update local state when props change
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);
  
  useEffect(() => {
    setLocalSRSConfig(srsConfig || DEFAULT_ANKI_CONFIG);
  }, [srsConfig]);
  
  if (!isOpen) return null;
  
  const handleSave = () => {
    onUpdateSettings(localSettings);
    onUpdateSRSConfig(localSRSConfig);
    // Save SRS config to localStorage
    localStorage.setItem('srsConfig', JSON.stringify(localSRSConfig));
    onClose();
  };
  
  const updateSetting = <K extends keyof CardSettings>(
    key: K,
    value: CardSettings[K]
  ) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };
  
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-card border border-border rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-border">
          <div className="flex items-center justify-between p-6 pb-0">
            <h2 className="text-xl font-semibold text-card-foreground">Flashcard Settings</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex px-6 mt-4">
            <button
              onClick={() => setActiveTab('card')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'card' 
                  ? 'text-primary border-primary' 
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              Card Settings
            </button>
            <button
              onClick={() => setActiveTab('srs')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ml-4 ${
                activeTab === 'srs' 
                  ? 'text-primary border-primary' 
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              SRS Algorithm
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'card' ? (
            <div className="space-y-6">
              {/* Daily Limits */}
              <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Hash className="w-5 h-5 text-primary" />
                Daily Limits
              </h3>
              
              <div className="space-y-4">
                {/* New Cards */}
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <span>New Cards per Day: {localSettings.dailyNewCards}</span>
                    <Tooltip text="Maximum number of new cards to introduce each day. Start with fewer cards to avoid overwhelming yourself.">
                      <HelpCircle className="w-4 h-4 text-muted-foreground" />
                    </Tooltip>
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={localSettings.dailyNewCards}
                    onChange={(e) => updateSetting('dailyNewCards', Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>5</span>
                    <span>50</span>
                    <span>100</span>
                  </div>
                </div>
                
                {/* Review Cards */}
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <span>Review Cards per Day: {localSettings.dailyReviewCards}</span>
                    <Tooltip text="Maximum number of review cards to show each day. This includes cards that are due for review based on the SRS algorithm.">
                      <HelpCircle className="w-4 h-4 text-muted-foreground" />
                    </Tooltip>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="10"
                    value={localSettings.dailyReviewCards}
                    onChange={(e) => updateSetting('dailyReviewCards', Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>10</span>
                    <span>100</span>
                    <span>200</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Card Order & Focus */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shuffle className="w-5 h-5 text-primary" />
                Card Order & Focus
              </h3>
              
              <div className="space-y-4">
                {/* Card Order */}
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <span>Card Order</span>
                    <Tooltip text="Sequential: Cards appear in the order they were added. Random: Cards are shuffled randomly. SRS Priority: Cards are ordered by their SRS due date.">
                      <HelpCircle className="w-4 h-4 text-muted-foreground" />
                    </Tooltip>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => updateSetting('cardOrder', 'sequential')}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        localSettings.cardOrder === 'sequential'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-input hover:bg-muted'
                      }`}
                    >
                      Sequential
                    </button>
                    <button
                      onClick={() => updateSetting('cardOrder', 'random')}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        localSettings.cardOrder === 'random'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-input hover:bg-muted'
                      }`}
                    >
                      Random
                    </button>
                    <button
                      onClick={() => updateSetting('cardOrder', 'srs')}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        localSettings.cardOrder === 'srs'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-input hover:bg-muted'
                      }`}
                    >
                      SRS Priority
                    </button>
                  </div>
                </div>
                
                {/* Focus Mode */}
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <span>Focus Mode</span>
                    <Tooltip text="Standard: All cards are shown equally. Weakest First: Prioritize cards with lower mastery. Oldest First: Prioritize cards that haven't been reviewed in the longest time.">
                      <HelpCircle className="w-4 h-4 text-muted-foreground" />
                    </Tooltip>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => updateSetting('focusMode', 'standard')}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        localSettings.focusMode === 'standard'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-input hover:bg-muted'
                      }`}
                    >
                      Standard
                    </button>
                    <button
                      onClick={() => updateSetting('focusMode', 'weakest')}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        localSettings.focusMode === 'weakest'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-input hover:bg-muted'
                      }`}
                    >
                      Weakest First
                    </button>
                    <button
                      onClick={() => updateSetting('focusMode', 'oldest')}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        localSettings.focusMode === 'oldest'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-input hover:bg-muted'
                      }`}
                    >
                      Oldest First
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Card Direction */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Card Direction
                <Tooltip text="Choose which side of the card to show first. 日→英 shows Japanese first, 英→日 shows English first, Mixed alternates randomly.">
                  <HelpCircle className="w-4 h-4 text-muted-foreground" />
                </Tooltip>
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => updateSetting('flipDirection', 'japanese-english')}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    localSettings.flipDirection === 'japanese-english'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-input hover:bg-muted'
                  }`}
                >
                  日→英
                </button>
                <button
                  onClick={() => updateSetting('flipDirection', 'english-japanese')}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    localSettings.flipDirection === 'english-japanese'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-input hover:bg-muted'
                  }`}
                >
                  英→日
                </button>
                <button
                  onClick={() => updateSetting('flipDirection', 'mixed')}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    localSettings.flipDirection === 'mixed'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-input hover:bg-muted'
                  }`}
                >
                  Mixed
                </button>
              </div>
            </div>
            
            {/* Display Settings */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Type className="w-5 h-5 text-primary" />
                Display Settings
              </h3>
              
              <div className="space-y-4">
                {/* Font Size */}
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <span>Font Size</span>
                    <Tooltip text="Adjust the size of text displayed on flashcards. Choose a comfortable size for your device and viewing distance.">
                      <HelpCircle className="w-4 h-4 text-muted-foreground" />
                    </Tooltip>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={() => updateSetting('fontSize', 'small')}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        localSettings.fontSize === 'small'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-input hover:bg-muted'
                      }`}
                    >
                      Small
                    </button>
                    <button
                      onClick={() => updateSetting('fontSize', 'medium')}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        localSettings.fontSize === 'medium'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-input hover:bg-muted'
                      }`}
                    >
                      Medium
                    </button>
                    <button
                      onClick={() => updateSetting('fontSize', 'large')}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        localSettings.fontSize === 'large'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-input hover:bg-muted'
                      }`}
                    >
                      Large
                    </button>
                    <button
                      onClick={() => updateSetting('fontSize', 'extra-large')}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        localSettings.fontSize === 'extra-large'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-input hover:bg-muted'
                      }`}
                    >
                      XL
                    </button>
                  </div>
                </div>
                
                {/* Toggles */}
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSettings.autoPlayAudio}
                      onChange={(e) => updateSetting('autoPlayAudio', e.target.checked)}
                      className="rounded border-border"
                    />
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Auto-play audio on answer</span>
                      <Tooltip text="Automatically play the pronunciation audio when revealing the answer side of the card.">
                        <HelpCircle className="w-3 h-3 text-muted-foreground" />
                      </Tooltip>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSettings.showFurigana}
                      onChange={(e) => updateSetting('showFurigana', e.target.checked)}
                      className="rounded border-border"
                    />
                    <div className="flex items-center gap-2">
                      <Type className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Show furigana (reading aid)</span>
                      <Tooltip text="Display small hiragana characters above kanji to help with pronunciation. Useful for beginners.">
                        <HelpCircle className="w-3 h-3 text-muted-foreground" />
                      </Tooltip>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSettings.showCardType}
                      onChange={(e) => updateSetting('showCardType', e.target.checked)}
                      className="rounded border-border"
                    />
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Show card type indicator</span>
                      <Tooltip text="Display badges showing whether a card is New, Learning, Review, or Relearning to help track your progress.">
                        <HelpCircle className="w-3 h-3 text-muted-foreground" />
                      </Tooltip>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
          ) : (
            // SRS Algorithm Tab
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  Spaced Repetition Settings
                </h3>
                <button
                  onClick={() => setLocalSRSConfig(DEFAULT_ANKI_CONFIG)}
                  className="px-3 py-1 text-sm border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset to Default
                </button>
              </div>

              {/* New Cards Settings */}
              <div>
                <h4 className="font-medium mb-3">New Cards</h4>
                <div className="space-y-4 pl-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <span>Learning Steps (minutes)</span>
                      <Tooltip text="Time intervals for new cards in learning phase. Cards must pass through all steps to graduate. Example: '1 10' means review after 1 minute, then 10 minutes.">
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </Tooltip>
                    </label>
                    <input
                      type="text"
                      value={localSRSConfig?.newSteps?.join(' ') || ''}
                      onChange={(e) => {
                        const steps = e.target.value.split(' ').map(s => parseInt(s)).filter(n => !isNaN(n));
                        const config = localSRSConfig || DEFAULT_ANKI_CONFIG;
                        setLocalSRSConfig({ ...config, newSteps: steps.length > 0 ? steps : [1] });
                      }}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                      placeholder="1 10"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Space-separated minutes (e.g., 1 10)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <span>Graduating Interval (days)</span>
                      <Tooltip text="The interval given to a card when you press 'Good' on the final learning step. This is when a card becomes a review card.">
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </Tooltip>
                    </label>
                    <input
                      type="number"
                      value={localSRSConfig?.graduatingInterval || 1}
                      onChange={(e) => {
                        const config = localSRSConfig || DEFAULT_ANKI_CONFIG;
                        setLocalSRSConfig({ ...config, graduatingInterval: Math.max(1, parseInt(e.target.value) || 1) });
                      }}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <span>Easy Interval (days)</span>
                      <Tooltip text="The interval given when you press 'Easy' on the final learning step. Should be longer than the graduating interval.">
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </Tooltip>
                    </label>
                    <input
                      type="number"
                      value={localSRSConfig?.easyInterval || 4}
                      onChange={(e) => {
                        const config = localSRSConfig || DEFAULT_ANKI_CONFIG;
                        setLocalSRSConfig({ ...config, easyInterval: Math.max(1, parseInt(e.target.value) || 4) });
                      }}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                      min="1"
                    />
                  </div>
                </div>
              </div>

              {/* Review Settings */}
              <div>
                <h4 className="font-medium mb-3">Reviews</h4>
                <div className="space-y-4 pl-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <span>Easy Bonus (%)</span>
                      <Tooltip text="Extra multiplier applied to intervals when you press 'Easy'. Default 130% means intervals grow 30% faster for easy cards.">
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </Tooltip>
                    </label>
                    <input
                      type="number"
                      value={Math.round((localSRSConfig?.easyBonus || 1.3) * 100)}
                      onChange={(e) => {
                        const config = localSRSConfig || DEFAULT_ANKI_CONFIG;
                        setLocalSRSConfig({ ...config, easyBonus: Math.max(1, parseInt(e.target.value) || 130) / 100 });
                      }}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                      min="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <span>Interval Modifier (%)</span>
                      <Tooltip text="Global multiplier for all review intervals. Lower values = more frequent reviews. Higher values = less frequent reviews.">
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </Tooltip>
                    </label>
                    <input
                      type="number"
                      value={Math.round((localSRSConfig?.intervalModifier || 1) * 100)}
                      onChange={(e) => {
                        const config = localSRSConfig || DEFAULT_ANKI_CONFIG;
                        setLocalSRSConfig({ ...config, intervalModifier: Math.max(0.1, parseInt(e.target.value) || 100) / 100 });
                      }}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                      min="10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <span>Maximum Interval (days)</span>
                      <Tooltip text="The longest time between reviews. Default is 100 years (36500 days). You can set this lower to see cards more frequently.">
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </Tooltip>
                    </label>
                    <input
                      type="number"
                      value={localSRSConfig?.maximumInterval || 36500}
                      onChange={(e) => {
                        const config = localSRSConfig || DEFAULT_ANKI_CONFIG;
                        setLocalSRSConfig({ ...config, maximumInterval: Math.max(1, parseInt(e.target.value) || 36500) });
                      }}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                      min="1"
                    />
                  </div>
                </div>
              </div>

              {/* Lapse Settings */}
              <div>
                <h4 className="font-medium mb-3">Lapses</h4>
                <div className="space-y-4 pl-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <span>Relearning Steps (minutes)</span>
                      <Tooltip text="Time intervals when a review card is forgotten and needs to be relearned. Usually shorter than initial learning steps.">
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </Tooltip>
                    </label>
                    <input
                      type="text"
                      value={localSRSConfig?.lapseSteps?.join(' ') || ''}
                      onChange={(e) => {
                        const steps = e.target.value.split(' ').map(s => parseInt(s)).filter(n => !isNaN(n));
                        const config = localSRSConfig || DEFAULT_ANKI_CONFIG;
                        setLocalSRSConfig({ ...config, lapseSteps: steps.length > 0 ? steps : [10] });
                      }}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                      placeholder="10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <span>New Interval (%)</span>
                      <Tooltip text="When a card lapses, its interval is multiplied by this percentage. 0% means start over, 100% keeps the same interval.">
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </Tooltip>
                    </label>
                    <input
                      type="number"
                      value={Math.round((localSRSConfig?.lapseNewInterval || 0) * 100)}
                      onChange={(e) => {
                        const config = localSRSConfig || DEFAULT_ANKI_CONFIG;
                        setLocalSRSConfig({ ...config, lapseNewInterval: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) / 100 });
                      }}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                      min="0"
                      max="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <span>Minimum Interval (days)</span>
                      <Tooltip text="The minimum interval for a lapsed card after completing relearning steps. Prevents intervals from becoming too short.">
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </Tooltip>
                    </label>
                    <input
                      type="number"
                      value={localSRSConfig?.minimumLapseInterval || 1}
                      onChange={(e) => {
                        const config = localSRSConfig || DEFAULT_ANKI_CONFIG;
                        setLocalSRSConfig({ ...config, minimumLapseInterval: Math.max(1, parseInt(e.target.value) || 1) });
                      }}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                      min="1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex gap-3 justify-end p-6 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent transition-colors"
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
  );
}