'use client';

import { useState, useEffect, useRef } from 'react';
import { NewsArticle, ExtractedVocabulary } from '@/types/news';
import { JapaneseWord } from '@/types';
import { searchWords } from '@/utils/api';
import { StudyListManager } from '@/utils/studyListManager';
import {
  ReadingAnalyticsManager,
  ReadingSession,
  formatReadingTime,
  getReadingSpeedCategory
} from '@/utils/readingAnalytics';
import { generateFuriganaWithCache, checkFuriganaApiHealth } from '@/utils/furigana';
import ArticleManager from '@/utils/articleManager';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import ImprovedArticleAudioPlayer from '@/components/audio/ImprovedArticleAudioPlayer';
import { GrammarHighlightedText, GrammarLegend } from './GrammarHighlightedText';

// Ruby tag parser for enhanced reading
function parseWithRubyTags(text: string): string {
  // Convert furigana notation like 漢字[かんじ] to <ruby>漢字<rt>かんじ</rt></ruby>
  const rubyPattern = /([一-龯]+)\[([ひらがな\u3040-\u309F]+)\]/g;
  return text.replace(rubyPattern, '<ruby>$1<rt>$2</rt></ruby>');
}

// Enhanced text renderer with ruby tag support
function RubyTextRenderer({ text, settings, onWordClick }: {
  text: string;
  settings: ReadingSettings;
  onWordClick?: (event: React.MouseEvent<HTMLElement>) => void;
}) {
  const processedText = parseWithRubyTags(text);

  return (
    <div
      className={`${settings.fontSize === 'small' ? 'text-sm' :
          settings.fontSize === 'medium' ? 'text-base' :
            settings.fontSize === 'large' ? 'text-lg' :
              'text-xl'
        } leading-relaxed [&_ruby]:cursor-pointer [&_ruby]:hover:bg-primary/20 [&_ruby]:transition-colors [&_ruby]:rounded [&_ruby]:px-0.5`}
      dangerouslySetInnerHTML={{ __html: processedText }}
      onClick={onWordClick}
      style={{
        lineHeight: '1.8',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif'
      }}
    />
  );
}
import ComprehensionQuiz from './ComprehensionQuiz';

interface ReadingSettings {
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  showFurigana: boolean;
  highlightVocabulary: boolean;
  highlightMode: 'none' | 'all' | 'content' | 'grammar';
  darkMode: boolean;
}

interface VocabularyPopupProps {
  word: string;
  position: { x: number; y: number };
  onClose: () => void;
  onSaveToList: (word: JapaneseWord) => void;
}

function VocabularyPopup({ word, position, onClose, onSaveToList }: VocabularyPopupProps) {
  const [wordData, setWordData] = useState<JapaneseWord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWordData = async () => {
      try {
        setLoading(true);
        setError(null);
        const results = await searchWords(word, 1);
        if (results.length > 0) {
          setWordData(results[0]);
        } else {
          setError('Word not found');
        }
      } catch (err) {
        setError('Failed to search for word');
      } finally {
        setLoading(false);
      }
    };

    fetchWordData();
  }, [word]);

  const handleSaveToList = () => {
    if (wordData) {
      onSaveToList(wordData);
    }
  };

  return (
    <div
      className="absolute z-50 bg-card border border-border rounded-lg shadow-lg p-4 max-w-sm"
      style={{
        left: Math.min(position.x, window.innerWidth - 320),
        top: position.y + 10,
      }}
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-medium text-foreground">{word}</h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="animate-spin">⏳</span>
          <span>Searching...</span>
        </div>
      )}

      {error && (
        <div className="text-destructive text-sm">{error}</div>
      )}

      {wordData && (
        <div className="space-y-3">
          <div>
            <div className="text-sm text-muted-foreground">Reading</div>
            <div className="font-medium">{wordData.kana}</div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground">Meaning</div>
            <div>{wordData.meaning}</div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 bg-primary/10 text-primary rounded">
              {wordData.jlpt}
            </span>
            <span className="px-2 py-1 bg-muted text-muted-foreground rounded">
              {wordData.type}
            </span>
          </div>

          <div className="flex gap-2 pt-2 border-t border-border">
            <button
              onClick={handleSaveToList}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90"
            >
              リストに保存
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface SettingsPanelProps {
  settings: ReadingSettings;
  onSettingsChange: (settings: ReadingSettings) => void;
  onClose: () => void;
}

function SettingsPanel({ settings, onSettingsChange, onClose }: SettingsPanelProps) {
  const handleFontSizeChange = (fontSize: ReadingSettings['fontSize']) => {
    onSettingsChange({ ...settings, fontSize });
  };

  const handleToggleFurigana = () => {
    onSettingsChange({ ...settings, showFurigana: !settings.showFurigana });
  };

  const handleToggleVocabularyHighlight = () => {
    onSettingsChange({ ...settings, highlightVocabulary: !settings.highlightVocabulary });
  };
  
  const handleHighlightModeChange = (mode: ReadingSettings['highlightMode']) => {
    onSettingsChange({ ...settings, highlightMode: mode });
  };

  return (
    <div className="absolute top-12 right-0 z-40 bg-card border border-border rounded-lg shadow-lg p-4 w-64">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium text-foreground">Reading Settings</h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        {/* Font Size */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Text Size
          </label>
          <div className="flex gap-2">
            {(['small', 'medium', 'large', 'xlarge'] as const).map((size) => (
              <button
                key={size}
                onClick={() => handleFontSizeChange(size)}
                className={`px-3 py-1 rounded text-sm ${settings.fontSize === size
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
              >
                {{
                  small: 'S',
                  medium: 'M',
                  large: 'L',
                  xlarge: 'XL'
                }[size]}
              </button>
            ))}
          </div>
        </div>

        {/* Furigana Toggle */}
        <div>
          <label className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              Show Furigana
            </span>
            <button
              onClick={handleToggleFurigana}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.showFurigana ? 'bg-primary' : 'bg-muted'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.showFurigana ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </label>
        </div>

        {/* Vocabulary Highlighting */}
        <div>
          <label className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              Highlight Vocabulary
            </span>
            <button
              onClick={handleToggleVocabularyHighlight}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.highlightVocabulary ? 'bg-primary' : 'bg-muted'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.highlightVocabulary ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </label>
          
          {/* Grammar Highlighting Mode */}
          {settings.highlightVocabulary && (
            <div className="mt-2 space-y-2">
              <label className="text-xs text-muted-foreground">Highlight Mode:</label>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => handleHighlightModeChange('all')}
                  className={`px-2 py-1 rounded text-xs ${
                    settings.highlightMode === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  All Words
                </button>
                <button
                  onClick={() => handleHighlightModeChange('content')}
                  className={`px-2 py-1 rounded text-xs ${
                    settings.highlightMode === 'content'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  Content Words
                </button>
                <button
                  onClick={() => handleHighlightModeChange('grammar')}
                  className={`px-2 py-1 rounded text-xs ${
                    settings.highlightMode === 'grammar'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  Grammar
                </button>
                <button
                  onClick={() => handleHighlightModeChange('none')}
                  className={`px-2 py-1 rounded text-xs ${
                    settings.highlightMode === 'none'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  None
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ArticleReaderProps {
  article: NewsArticle;
  onBack: () => void;
}

export function ArticleReader({ article, onBack }: ArticleReaderProps) {
  const { user } = useAuth();
  const { userType } = useSubscription();
  const isPremium = userType === 'monthly' || userType === 'yearly';

  const [settings, setSettings] = useState<ReadingSettings>(() => {
    // Load settings from localStorage
    if (typeof window !== 'undefined') {
      const savedSettings = localStorage.getItem('readingSettings');
      if (savedSettings) {
        try {
          return JSON.parse(savedSettings);
        } catch (e) {
          console.error('Failed to parse saved settings:', e);
        }
      }
    }
    return {
      fontSize: 'medium',
      showFurigana: true,
      highlightVocabulary: true,
      highlightMode: 'content',
      darkMode: false
    };
  });

  const [showSettings, setShowSettings] = useState(false);
  const [selectedWord, setSelectedWord] = useState<{
    word: string;
    position: { x: number; y: number };
  } | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [bookmarkError, setBookmarkError] = useState<string | null>(null);
  const [readingStartTime] = useState(new Date());
  const [readingProgress, setReadingProgress] = useState(0);
  const [readingSession, setReadingSession] = useState<ReadingSession | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizDismissed, setQuizDismissed] = useState(false);
  const [comprehensionScore, setComprehensionScore] = useState<number | null>(null);
  const [readingTimeDisplay, setReadingTimeDisplay] = useState(0);
  const [vocabularyEncountered, setVocabularyEncountered] = useState<Set<string>>(new Set());
  const [statsVisible, setStatsVisible] = useState(false);
  const [userRequestedStats, setUserRequestedStats] = useState(false);
  const [stableWPM, setStableWPM] = useState(0);
  const [processedContent, setProcessedContent] = useState<string[]>([]);
  const [contentLoading, setContentLoading] = useState(true);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  const articleRef = useRef<HTMLDivElement>(null);
  const timeUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  // Save settings to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('readingSettings', JSON.stringify(settings));
    }
  }, [settings]);

  // Extract vocabulary from article content
  const extractVocabularyFromText = (text: string): string[] => {
    // Simple Japanese word extraction (this would be more sophisticated in production)
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g;
    const matches = text.match(japaneseRegex) || [];
    return [...new Set(matches)].filter(word => word.length > 1);
  };

  // Handle word click for vocabulary lookup
  const handleWordClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!settings.highlightVocabulary) return;

    const target = event.target as HTMLElement;
    let word = '';

    // Check if clicked element is part of a ruby tag
    if (target.tagName === 'RT') {
      // Clicked on furigana - get the kanji from the parent ruby element
      const rubyElement = target.closest('ruby');
      if (rubyElement) {
        // Extract just the kanji text (before the <rt> tag)
        const textNode = rubyElement.firstChild;
        word = textNode?.textContent?.trim() || '';
      }
    } else if (target.tagName === 'RUBY') {
      // Clicked on ruby element - get the kanji part
      const textNode = target.firstChild;
      word = textNode?.textContent?.trim() || '';
    } else {
      // Regular text element
      word = target.textContent?.trim() || '';
    }

    if (word && word.length > 1) {
      const rect = target.getBoundingClientRect();
      setSelectedWord({
        word,
        position: {
          x: rect.left,
          y: rect.top + window.scrollY
        }
      });
    }
  };

  // Save word to study list
  const handleSaveWordToList = async (word: JapaneseWord) => {
    try {
      // Get or create a default reading list
      const lists = await StudyListManager.getAllStudyLists();
      let readingList = lists.find(list => list.name === 'Reading Practice');

      if (!readingList) {
        readingList = await StudyListManager.createStudyList(
          'Reading Practice',
          'drillable',
          'Words from news articles'
        );
      }

      await StudyListManager.addItemToLists(word, 'word', [readingList.id]);

      // Close popup
      setSelectedWord(null);

      // Show success message (you could add a toast notification here)
    } catch (error) {
      console.error('Failed to save word to list:', error);
    }
  };

  // Add furigana to Japanese text using Kuromoji tokenizer
  const addFuriganaToText = async (text: string): Promise<string> => {
    if (!settings.showFurigana) {
      return text;
    }

    try {
      // Use the new Kuromoji-based furigana API with caching
      const furiganaText = await generateFuriganaWithCache(text);
      return furiganaText;
    } catch (error) {
      console.error('Failed to generate furigana:', error);
      // Fallback to original text if furigana generation fails
      return text;
    }
  };

  // Render text with vocabulary highlighting and furigana
  const renderTextWithHighlighting = async (text: string): Promise<string> => {
    let processedText = text;

    // First add furigana if enabled
    if (settings.showFurigana) {
      processedText = await addFuriganaToText(processedText);
    }

    // Then add vocabulary highlighting if enabled
    if (settings.highlightVocabulary) {
      const vocabulary = extractVocabularyFromText(text); // Use original text for extraction

      vocabulary.forEach((word) => {
        // Skip if word is already part of a ruby tag
        if (processedText.includes(`<ruby>${word}`) || processedText.includes(`<rt>${word}`)) {
          return;
        }

        const regex = new RegExp(`(?<!<[^>]*)(${word})(?![^<]*>)`, 'g');
        processedText = processedText.replace(
          regex,
          `<span class="vocabulary-highlight cursor-pointer hover:bg-primary/20 transition-colors rounded px-0.5" data-word="$1">$1</span>`
        );
      });
    }

    return processedText;
  };

  // Track reading progress
  const handleScroll = () => {
    if (articleRef.current) {
      const element = articleRef.current;
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = element.offsetHeight;

      const progress = Math.min(
        100,
        Math.max(0, ((scrollTop + windowHeight - element.offsetTop) / documentHeight) * 100)
      );

      setReadingProgress(progress);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Process article content when settings change
  useEffect(() => {
    const processContent = async () => {
      setContentLoading(true);
      try {
        const paragraphs = article.content.split('\n');
        const processedParagraphs = await Promise.all(
          paragraphs.map(paragraph => renderTextWithHighlighting(paragraph))
        );
        setProcessedContent(processedParagraphs);
      } catch (error) {
        console.error('Error processing article content:', error);
        // Fallback to unprocessed content
        setProcessedContent(article.content.split('\n'));
      } finally {
        setContentLoading(false);
      }
    };

    processContent();
  }, [article.content, settings.showFurigana, settings.highlightVocabulary]);

  // Initialize reading session
  useEffect(() => {
    const session = ReadingAnalyticsManager.startReadingSession(article.id);
    setReadingSession(session);

    // Track vocabulary encountered (only once)
    const vocabulary = extractVocabularyFromText(article.content);
    setVocabularyEncountered(new Set(vocabulary));

    // Update reading time only when stats are visible and user requested them
    if (userRequestedStats) {
      timeUpdateInterval.current = setInterval(() => {
        setReadingTimeDisplay(prev => prev + 1);

        // Update session progress
        if (session) {
          ReadingAnalyticsManager.updateReadingSession(session.id, {
            readingTimeSeconds: Math.floor((Date.now() - session.startTime.getTime()) / 1000),
            scrollProgress: readingProgress,
            vocabularyEncountered: Array.from(vocabularyEncountered)
          });
        }
      }, 5000); // Update every 5 seconds instead of every second
    }

    return () => {
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
      }
    };
  }, [article.id, article.content, userRequestedStats]);

  // Load bookmark status
  useEffect(() => {
    const checkBookmarkStatus = async () => {
      if (!user) {
        setIsBookmarked(false);
        return;
      }
      try {
        // ArticleManager returns all bookmarks, filter for this article
        const bookmarks = await ArticleManager.getUserBookmarks(user.uid);
        setIsBookmarked(bookmarks.some(b => b.contentType === 'article' && b.contentId === article.id));
      } catch (error) {
        console.error('Error checking bookmark status:', error);
        setIsBookmarked(false);
      }
    };
    checkBookmarkStatus();
  }, [article.id, user]);

  const handleBookmarkToggle = async () => {
    if (!user) {
      setBookmarkError('Please log in to bookmark articles');
      return;
    }
    setBookmarkLoading(true);
    setBookmarkError(null);
    try {
      if (isBookmarked) {
        await ArticleManager.removeBookmark(user.uid, article.id);
        setIsBookmarked(false);
      } else {
        await ArticleManager.bookmarkArticle(user.uid, article.id, isPremium);
        setIsBookmarked(true);
      }
    } catch (error: any) {
      console.error('Error toggling bookmark:', error);
      setBookmarkError(error?.message || 'Failed to update bookmark');
    } finally {
      setBookmarkLoading(false);
    }
  };

  // Handle reading completion
  const handleReadingComplete = () => {
    if (readingSession && readingProgress >= 80) {
      setShowQuiz(true);
    }
  };

  // Handle comprehension quiz completion
  const handleQuizComplete = (score: number) => {
    setComprehensionScore(score);
    setQuizCompleted(true);
    setShowQuiz(false);
  };

  // Quiz notification - completely user-controlled (no auto-display)
  const [showQuizNotification, setShowQuizNotification] = useState(false);

  // Removed automatic quiz notification - quiz is now only available via manual trigger

  const getFontSizeClass = () => {
    const sizes = {
      small: 'text-sm',
      medium: 'text-base',
      large: 'text-lg',
      xlarge: 'text-xl'
    };
    return sizes[settings.fontSize];
  };

  const getReadingSpeedWPM = () => {
    if (readingTimeDisplay === 0) return 0;
    const estimatedWords = article.content.length / 2; // Rough estimate for Japanese
    const minutes = readingTimeDisplay / 60;
    return Math.round(estimatedWords / minutes);
  };

  return (
    <div className="container mx-auto px-4 py-6 min-h-screen pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with navigation and controls */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg font-medium transition-all transform hover:scale-105 active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M15 19l-7-7 7-7" 
              />
            </svg>
            <span>Back to Articles</span>
          </button>

          <div className="relative">
            {/* Options Menu Button */}
            <button
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" 
                />
              </svg>
              <span>Options</span>
            </button>

            {/* Dropdown Menu */}
            {showOptionsMenu && (
              <div className="absolute top-12 right-0 z-50 bg-card border border-border rounded-lg shadow-lg p-1 w-64">
                {/* Audio Reader */}
                <button
                  onClick={() => {
                    window.location.href = `/reading/audio?id=${article.id}&source=news`;
                    setShowOptionsMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-lg transition-colors text-left"
                >
                  <span className="text-xl">📚</span>
                  <div>
                    <div className="font-medium">Audio Reader</div>
                    <div className="text-sm text-muted-foreground">Open immersive reading mode</div>
                  </div>
                </button>

                {/* Quiz */}
                <button
                  onClick={() => {
                    setShowQuiz(true);
                    setShowOptionsMenu(false);
                  }}
                  disabled={quizCompleted}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-lg transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-xl">🎯</span>
                  <div>
                    <div className="font-medium">Comprehension Quiz</div>
                    <div className="text-sm text-muted-foreground">
                      {quizCompleted ? 'Already completed' : 'Test your understanding'}
                    </div>
                  </div>
                </button>

                {/* Bookmark */}
                <button
                  onClick={() => {
                    handleBookmarkToggle();
                    setShowOptionsMenu(false);
                  }}
                  disabled={bookmarkLoading || !user}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-lg transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-xl">{isBookmarked ? '★' : '☆'}</span>
                  <div>
                    <div className="font-medium">{isBookmarked ? 'Remove Bookmark' : 'Bookmark Article'}</div>
                    <div className="text-sm text-muted-foreground">
                      {!user ? 'Login required' : 'Save for later'}
                    </div>
                  </div>
                </button>

                <div className="border-t border-border my-1"></div>

                {/* Settings */}
                <button
                  onClick={() => {
                    setShowSettings(true);
                    setShowOptionsMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-lg transition-colors text-left"
                >
                  <span className="text-xl">⚙️</span>
                  <div>
                    <div className="font-medium">Reading Settings</div>
                    <div className="text-sm text-muted-foreground">Font size, furigana, etc.</div>
                  </div>
                </button>
              </div>
            )}

            {/* Settings Panel (separate from menu) */}
            {showSettings && (
              <SettingsPanel
                settings={settings}
                onSettingsChange={setSettings}
                onClose={() => setShowSettings(false)}
              />
            )}
          </div>
        </div>

        {/* Reading progress bar */}
        <div className="w-full bg-muted rounded-full h-1 mb-6">
          <div
            className="bg-primary h-1 rounded-full transition-all duration-300"
            style={{ width: `${readingProgress}%` }}
          />
        </div>

        {/* Article content */}
        <article
          ref={articleRef}
          className="bg-card rounded-lg p-6 md:p-8 border border-border"
        >
          {/* Article header */}
          <header className="mb-8">
            <h1 className={`font-bold text-foreground mb-4 ${settings.fontSize === 'xlarge' ? 'text-3xl' :
                settings.fontSize === 'large' ? 'text-2xl' :
                  settings.fontSize === 'medium' ? 'text-xl' : 'text-lg'
              }`}>
              {article.title}
            </h1>

            {/* Article metadata */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
              <span>📅 {new Date(article.publishDate).toLocaleDateString('ja-JP')}</span>
              <span>📖 About {article.estimatedReadingTime} min</span>
              <span>📊 {article.difficulty}</span>
              <span>🏷️ {article.category}</span>
            </div>

            {/* Article image */}
            {article.imageUrl && (
              <div className="w-full max-w-2xl mx-auto mb-6">
                <img
                  src={article.imageUrl}
                  alt=""
                  className="w-full rounded-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
          </header>

          {/* Audio Player */}
          <ImprovedArticleAudioPlayer article={article} />
          
          {/* Grammar Legend */}
          {settings.highlightVocabulary && settings.highlightMode !== 'none' && (
            <div className="mb-6 p-4 bg-muted/30 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Grammar Color Guide:</h4>
              <GrammarLegend />
            </div>
          )}

          {/* Article body */}
          <div
            className={`prose prose-lg max-w-none leading-relaxed ${getFontSizeClass()}`}
          >
            {contentLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Processing content...</p>
              </div>
            ) : (
              processedContent.map((paragraph, index) => (
                <div key={index} className="mb-6">
                  {settings.highlightVocabulary && settings.highlightMode !== 'none' ? (
                    <GrammarHighlightedText
                      text={paragraph}
                      highlightMode={settings.highlightMode}
                      showFurigana={settings.showFurigana}
                      onWordClick={(word, e) => {
                        const target = e.target as HTMLElement;
                        const rect = target.getBoundingClientRect();
                        setSelectedWord({
                          word,
                          position: {
                            x: rect.left,
                            y: rect.top + window.scrollY
                          }
                        });
                      }}
                      className={getFontSizeClass()}
                    />
                  ) : (
                    <RubyTextRenderer
                      text={paragraph}
                      settings={settings}
                      onWordClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.classList.contains('vocabulary-highlight') ||
                          target.tagName === 'RUBY' ||
                          target.tagName === 'RT' ||
                          target.closest('ruby')) {
                          handleWordClick(e);
                        }
                      }}
                    />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Article footer */}
          <footer className="mt-8 pt-6 border-t border-border">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Reading time: {Math.ceil((new Date().getTime() - readingStartTime.getTime()) / 60000)} min
              </div>

              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 text-sm font-medium bg-primary/5 px-3 py-1.5 rounded-md transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
                  />
                </svg>
                View original article
              </a>
            </div>
          </footer>
        </article>

        {/* Vocabulary popup */}
        {selectedWord && (
          <VocabularyPopup
            word={selectedWord.word}
            position={selectedWord.position}
            onClose={() => setSelectedWord(null)}
            onSaveToList={handleSaveWordToList}
          />
        )}

        {/* Bookmark error notification */}
        {bookmarkError && (
          <div className="fixed top-4 right-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 shadow-lg max-w-sm z-50">
            <div className="flex items-start gap-3">
              <span className="text-red-500">⚠️</span>
              <div className="flex-1">
                <h4 className="font-medium text-red-800 dark:text-red-200 mb-1">
                  Bookmark Limit Reached
                </h4>
                <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                  {bookmarkError}
                </p>
                {bookmarkError.includes('Upgrade to Premium') && (
                  <div className="flex gap-2">
                    <a
                      href="/subscription"
                      className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 transition-colors"
                    >
                      Upgrade Now
                    </a>
                    <button
                      onClick={() => setBookmarkError(null)}
                      className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Not Now
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setBookmarkError(null)}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
              >
                ✕
              </button>
            </div>
          </div>
        )}


        {/* Quiz Notification Banner */}
        {showQuizNotification && !showQuiz && !quizCompleted && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 shadow-lg max-w-md z-50">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🎯</span>
              <div className="flex-1">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                  Ready for Comprehension Quiz?
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                  You've read 80% of the article. Test your understanding!
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowQuiz(true);
                      setShowQuizNotification(false);
                    }}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    Take Quiz
                  </button>
                  <button
                    onClick={() => {
                      setShowQuizNotification(false);
                      setQuizDismissed(true);
                    }}
                    className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    No Thanks
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowQuizNotification(false)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Comprehension Quiz */}
        {showQuiz && readingSession && (
          <ComprehensionQuiz
            article={article}
            sessionId={readingSession.id}
            onComplete={handleQuizComplete}
            onClose={() => setShowQuiz(false)}
          />
        )}


        {/* Reading Completion Celebration */}
        {quizCompleted && comprehensionScore !== null && (
          <div className="fixed top-4 right-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 shadow-lg max-w-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🎯</span>
              <div>
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-1">
                  記事読了完了！
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                  理解度スコア: {comprehensionScore}点
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  読書時間: {formatReadingTime(readingTimeDisplay)} |
                  速度: {getReadingSpeedCategory(getReadingSpeedWPM())}
                </p>
              </div>
              <button
                onClick={() => setQuizCompleted(false)}
                className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Click outside to close popups */}
        {(selectedWord || showSettings || showOptionsMenu) && (
          <div
            className="fixed inset-0 z-30"
            onClick={() => {
              setSelectedWord(null);
              setShowSettings(false);
              setShowOptionsMenu(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

export default ArticleReader;
