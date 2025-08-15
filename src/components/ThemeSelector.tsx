'use client';

import { useState } from 'react';
import { ColorScheme, ThemeMode } from '@/types';
import { colorPalettes, getThemePreview } from '@/utils/themes';

interface ThemeSelectorProps {
  currentTheme: ThemeMode;
  currentColorScheme: ColorScheme;
  onThemeChange: (theme: ThemeMode, colorScheme: ColorScheme) => void;
}

export function ThemeSelector({ currentTheme, currentColorScheme, onThemeChange }: ThemeSelectorProps) {
  // Ensure we have valid defaults
  const safeCurrentTheme = currentTheme || 'system';
  const safeCurrentColorScheme = currentColorScheme || 'default';

  const [showModal, setShowModal] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>(safeCurrentTheme);
  const [selectedColorScheme, setSelectedColorScheme] = useState<ColorScheme>(safeCurrentColorScheme);

  const handleApply = () => {
    onThemeChange(selectedTheme, selectedColorScheme);
    setShowModal(false);
  };

  const handleReset = () => {
    setSelectedTheme(currentTheme);
    setSelectedColorScheme(currentColorScheme);
  };

  return (
    <>
      {/* Theme Button */}
      <button
        onClick={() => setShowModal(true)}
        className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              App Theme
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
              <span className="capitalize">{safeCurrentTheme}</span>
              <span>•</span>
              <span>{colorPalettes[safeCurrentColorScheme]?.name || 'Default'}</span>
              <div className="flex gap-1 ml-2">
                {(() => {
                  try {
                    const preview = getThemePreview(safeCurrentColorScheme);
                    return (
                      <>
                        <div
                          className="w-3 h-3 rounded-full border border-border/20"
                          style={{ backgroundColor: preview.primary }}
                        />
                        <div
                          className="w-3 h-3 rounded-full border border-border/20"
                          style={{ backgroundColor: preview.accent }}
                        />
                      </>
                    );
                  } catch (error) {

                    return null;
                  }
                })()}
              </div>
            </div>
          </div>
          <div className="text-muted-foreground group-hover:text-primary transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </button>

      {/* Theme Selection Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-card border border-border rounded-lg p-4 max-w-2xl w-full max-h-[75vh] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-card-foreground">Choose Your Theme</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted/50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Theme Mode Selection */}
              <div className="mb-6">
                <div className="text-sm font-medium text-card-foreground mb-3">Brightness</div>
                <div className="grid grid-cols-3 gap-3">
                  {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setSelectedTheme(mode)}
                      className={`p-3 rounded-lg border text-center transition-colors ${
                        selectedTheme === mode
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-background border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      <div className="text-2xl mb-1">
                        {mode === 'light' ? '☀️' : mode === 'dark' ? '🌙' : '🖥️'}
                      </div>
                      <div className="text-xs capitalize">{mode}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Scheme Selection */}
              <div className="mb-4">
                <div className="text-sm font-medium text-card-foreground mb-3">Color Scheme</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(Object.keys(colorPalettes) as ColorScheme[]).map((scheme) => {
                    const palette = colorPalettes[scheme];
                    const preview = getThemePreview(scheme);

                    return (
                      <button
                        key={scheme}
                        onClick={() => setSelectedColorScheme(scheme)}
                        className={`p-3 rounded-lg border text-center transition-colors ${
                          selectedColorScheme === scheme
                            ? 'bg-primary/10 border-primary'
                            : 'bg-background border-border hover:bg-muted'
                        }`}
                      >
                        {/* Color Preview */}
                        <div className="flex justify-center gap-1 mb-2">
                          <div
                            className="w-4 h-4 rounded-full border border-border/20"
                            style={{ backgroundColor: preview.primary }}
                          />
                          <div
                            className="w-4 h-4 rounded-full border border-border/20"
                            style={{ backgroundColor: preview.secondary }}
                          />
                          <div
                            className="w-4 h-4 rounded-full border border-border/20"
                            style={{ backgroundColor: preview.accent }}
                          />
                        </div>

                        {/* Theme Name */}
                        <div className={`text-sm font-medium ${
                          selectedColorScheme === scheme ? 'text-primary' : 'text-foreground'
                        }`}>
                          {palette.name}
                        </div>

                        {/* Theme Description */}
                        <div className="text-xs text-muted-foreground mt-1">
                          {palette.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preview Section - Simplified */}
              <div className="mb-4 p-3 rounded-lg border border-border bg-muted/30">
                <div className="text-sm font-medium text-card-foreground mb-1">Preview</div>
                <div className="text-xs text-muted-foreground">
                  {selectedTheme === 'system' ? 'Follows system preference' : `${selectedTheme} mode`} • {colorPalettes[selectedColorScheme].name} scheme
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Reset
              </button>
              <button
                onClick={handleApply}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                Apply Theme
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
